import React, { useRef, useState, useEffect } from "react";
import { Hands } from "@mediapipe/hands";
import { Pose } from "@mediapipe/pose";
import * as cam from "@mediapipe/camera_utils";
import axios from "axios";
import "./RealtimePredictor.css"; // <-- use your CSS like in the second code
// Hand + Pose connections
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];
const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],
  [0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],
  [11,13],[13,15],[15,17],[15,19],[15,21],
  [17,19],[12,14],[14,16],[16,18],[16,20],[16,22],
  [18,20]
];

// --- Drawing helpers ---
function drawConnectors(ctx, landmarks, connections, opts = {}) {
  const lineWidth = opts.lineWidth ?? 2;
  const color = opts.color ?? "#00FF00";
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  for (const [i, j] of connections) {
    if (landmarks[i] && landmarks[j]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[i].x * ctx.canvas.width, landmarks[i].y * ctx.canvas.height);
      ctx.lineTo(landmarks[j].x * ctx.canvas.width, landmarks[j].y * ctx.canvas.height);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawLandmarks(ctx, landmarks, opts = {}) {
  const radius = opts.radius ?? 4;
  const color = opts.color ?? "#FF0000";
  ctx.save();
  ctx.fillStyle = color;
  for (const lm of landmarks) {
    if (!lm) continue;
    ctx.beginPath();
    ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

const RealtimePredictor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sequenceRef = useRef([]);
  const predictingRef = useRef(false);
  const frameCountRef = useRef(0);

  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [allPredictions, setAllPredictions] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SEQ_LEN = 50;
  const PREDICT_EVERY_N_FRAMES = 3;
  let hands, pose, camera;

  // Convert landmarks
  const toArray = (lms) => !lms ? [] : lms.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }));

  const collectFrame = (results) => {
    let left = [], right = [];
    if (results.multiHandedness && results.multiHandLandmarks) {
      for (let i = 0; i < results.multiHandedness.length; i++) {
        const label = results.multiHandedness[i].label;
        if (label === "Left") left = toArray(results.multiHandLandmarks[i]);
        else if (label === "Right") right = toArray(results.multiHandLandmarks[i]);
      }
    }
    const pose = toArray(results.poseLandmarks);
    return { left, right, pose };
  };

  const sendForPrediction = async (seq) => {
    try {
      predictingRef.current = true;
      setLoading(true);
      let paddedSeq = seq;
      if (seq.length < SEQ_LEN) {
        const pad = Array(SEQ_LEN - seq.length).fill({ left: [], right: [], pose: [] });
        paddedSeq = [...pad, ...seq];
      }
      const res = await axios.post("http://localhost:5000/predict", { data: paddedSeq });
      const word = res.data.prediction || "";

      setPrediction(word);
      setConfidence(res.data.confidence ? (res.data.confidence * 100).toFixed(2) + "%" : null);
      const timestamp = new Date().toLocaleTimeString();
      setAllPredictions((prev) => [...prev, { prediction: word, timestamp }].slice(-3));
    } catch (err) {
      setError("Prediction failed.");
    } finally {
      predictingRef.current = false;
      sequenceRef.current = [];
      frameCountRef.current = 0;
      setFrameCount(0);
      setLoading(false);
    }
  };

  const startRecognition = () => {
    setIsActive(true);
    setAllPredictions([]);
    sequenceRef.current = [];
    frameCountRef.current = 0;

    hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

    let lastResults = {};
    hands.onResults((r) => { lastResults.hands = r; });
    pose.onResults((r) => { lastResults.pose = r; });

    camera = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
        await pose.send({ image: videoRef.current });
        const merged = { ...lastResults.hands, ...lastResults.pose };

        // Draw
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (merged.poseLandmarks) {
          drawConnectors(ctx, merged.poseLandmarks, POSE_CONNECTIONS, { color: "#00FFFF" });
          drawLandmarks(ctx, merged.poseLandmarks, { color: "#FF00FF", radius: 3 });
        }
        if (merged.multiHandLandmarks) {
          for (const hand of merged.multiHandLandmarks) {
            drawConnectors(ctx, hand, HAND_CONNECTIONS, { color: "#00FF00" });
            drawLandmarks(ctx, hand, { color: "#FF0000", radius: 4 });
          }
        }

        // Sequence logic
        if (!predictingRef.current) {
          const frame = collectFrame(merged);
          sequenceRef.current.push(frame);
          if (sequenceRef.current.length > SEQ_LEN)
            sequenceRef.current = sequenceRef.current.slice(-SEQ_LEN);

          frameCountRef.current++;
          setFrameCount(sequenceRef.current.length);

          if (sequenceRef.current.length === SEQ_LEN && frameCountRef.current % PREDICT_EVERY_N_FRAMES === 0) {
            sendForPrediction([...sequenceRef.current]);
          }
        }
      },
      width: 640,
      height: 480,
    });
    camera.start();
  };

  const stopRecognition = () => {
    setIsActive(false);
    if (camera) camera.stop();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    sequenceRef.current = [];
    frameCountRef.current = 0;
    setFrameCount(0);
  };

  return (
    <div className="live-predictor-container">
      <h1 className="page-title">Live Sign Language Recognition</h1>

      <div className="video-prediction-container">
        <div className="video-container">
          <video ref={videoRef} className="video-feed" autoPlay muted />
          <canvas ref={canvasRef} className="overlay-canvas" width={640} height={480} />
          {isActive && (
            <div className="countdown-timer">
              Capturing: {frameCount}/{SEQ_LEN} {loading && " | Processing..."}
            </div>
          )}
          <div className="controls">
            {!isActive ? (
              <button className="control-button start-button" onClick={startRecognition}>
                Start Recognition
              </button>
            ) : (
              <button className="control-button stop-button" onClick={stopRecognition}>
                Stop Recognition
              </button>
            )}
          </div>
        </div>

        <div className="prediction-display">
          <h2>Current Prediction</h2>
          {loading ? (
            <div className="loading">Processing...</div>
          ) : prediction ? (
            <div className="prediction-result">{prediction}:{confidence}</div>
          ) : (
            <div className="no-prediction">No prediction yet</div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="prediction-history">
        <h2>Prediction History</h2>
        {allPredictions.length > 0 ? (
          <div className="prediction-list">
            {allPredictions.map((item, i) => (
              <div key={i} className="prediction-item">
                <span className="prediction-time">{item.timestamp}</span>
                <span className="prediction-text">{item.prediction}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-history">No predictions yet</p>
        )}
      </div>
      <div className="instructions">
        <h3>How to use:</h3>
        <ol>
          <li>Click "Start Continuous Recognition" to activate webcam</li>
          <li>Perform signs continuously as the system captures frames</li>
          <li>System will capture and process 110 frames at a time</li>
          <li>Multiple predictions can be processed simultaneously</li>
          <li>Watch predictions appear in the history list</li>
          <li>Click "Stop Recognition" when finished</li>
        </ol>
        <p className="note">Tip: Make sure your hands are clearly visible and well-lit for better recognition accuracy.</p>
      </div>
    </div>
  );
};

export default RealtimePredictor;
