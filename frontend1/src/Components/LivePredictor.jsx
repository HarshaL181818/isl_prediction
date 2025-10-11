import React, { useState, useRef, useEffect } from 'react';
import './LivePredictor.css';

// Hand + Pose connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];
const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],
  [0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],
  [11,13],[13,15],[15,17],[15,19],[15,21],
  [17,19],[12,14],[14,16],[16,18],[16,20],[16,22],
  [18,20]
];

function drawConnectors(ctx, landmarks, connections, opts = {}) {
  const lineWidth = opts.lineWidth ?? 2;
  const color = opts.color ?? '#00FF00';
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  for (const pair of connections) {
    const [i, j] = pair;
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * ctx.canvas.width, a.y * ctx.canvas.height);
    ctx.lineTo(b.x * ctx.canvas.width, b.y * ctx.canvas.height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLandmarks(ctx, landmarks, opts = {}) {
  const radius = opts.radius ?? 4;
  const color = opts.color ?? '#FF0000';
  ctx.save();
  ctx.fillStyle = color;
  for (const p of landmarks) {
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(
      p.x * ctx.canvas.width,
      p.y * ctx.canvas.height,
      radius,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }
  ctx.restore();
}

const LivePredictor = () => {
  const [prediction, setPrediction] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allPredictions, setAllPredictions] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [pendingFrames, setPendingFrames] = useState(0);

  // Queue management
  const predictionQueueRef = useRef([]);
  const processingCountRef = useRef(0);

  // MediaPipe-related refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // overlay
  const rafRef = useRef(null);
  const runningModeRef = useRef("IMAGE");
  const lastVideoTimeRef = useRef(-1);
  const handLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);

  const frameBufferRef = useRef([]);
  const TOTAL_FRAMES = 50;
  const MAX_CONCURRENT_REQUESTS = 3;
  const isProcessingRef = useRef(false);
  useEffect(() => {
    let mounted = true;
    let createdHL = null;
    let createdPL = null;

    (async () => {
      try {
        const mp = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0");
        const { FilesetResolver, HandLandmarker, PoseLandmarker } = mp;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        createdHL = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: runningModeRef.current,
          numHands: 2,
        });

        createdPL = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: runningModeRef.current,
          numPoses: 1,
        });

        if (!mounted) return;
        handLandmarkerRef.current = createdHL;
        poseLandmarkerRef.current = createdPL;
      } catch (err) {
        console.error("Failed to load MediaPipe", err);
      }
    })();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (createdHL?.close) createdHL.close();
      if (createdPL?.close) createdPL.close();
    };
  }, []);

  const startContinuousRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setIsRecording(true);
      setAllPredictions([]);
      frameBufferRef.current = [];
      predictionQueueRef.current = [];
      processingCountRef.current = 0;
      setFrameCount(0);
      setPendingFrames(0);

      rafRef.current = requestAnimationFrame(predictWebcam);
    } catch (err) {
      console.error("Webcam error:", err);
      setError("Could not access webcam.");
    }
  };

  const stopContinuousRecording = () => {
    setIsActive(false);
    setIsRecording(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    frameBufferRef.current = [];
    predictionQueueRef.current = [];
    processingCountRef.current = 0;
    setFrameCount(0);
    setPendingFrames(0);
  };

  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current) {
      rafRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.style.width = video.clientWidth + "px";
      canvas.style.height = video.clientHeight + "px";
    }

    try {
      if (runningModeRef.current === "IMAGE") {
        runningModeRef.current = "VIDEO";
        await handLandmarkerRef.current.setOptions({ runningMode: "VIDEO" });
        await poseLandmarkerRef.current.setOptions({ runningMode: "VIDEO" });
      }

      const startTimeMs = performance.now();

      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;

        const [handRes, poseRes] = await Promise.all([
          handLandmarkerRef.current.detectForVideo(video, startTimeMs),
          poseLandmarkerRef.current.detectForVideo(video, startTimeMs),
        ]);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let leftHand = null, rightHand = null, pose = null;

        if (handRes?.landmarks) {
          for (let i = 0; i < handRes.handednesses.length; i++) {
            const category = handRes.handednesses[i];
            if (category[0].categoryName === "Left") {
              leftHand = handRes.landmarks[i];
              drawConnectors(ctx, leftHand, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
              drawLandmarks(ctx, leftHand, { color: '#FF0000', radius: 3 });
            } else if (category[0].categoryName === "Right") {
              rightHand = handRes.landmarks[i];
              drawConnectors(ctx, rightHand, HAND_CONNECTIONS, { color: '#6600ff', lineWidth: 5 });
              drawLandmarks(ctx, rightHand, { color: '#0a0a0a', radius: 3 });
            }
          }
        }

        if (poseRes?.landmarks) {
          pose = poseRes.landmarks[0];
          drawConnectors(ctx, pose, POSE_CONNECTIONS, { color: '#00FFFF', lineWidth: 2 });
          drawLandmarks(ctx, pose, { color: '#FF00FF', radius: 3 });
        }

        const frameData = {
          left: leftHand,
          right: rightHand,
          pose: pose,
          ts: Date.now(),
        };

        frameBufferRef.current.push(frameData);
        setFrameCount(frameBufferRef.current.length);

        if (frameBufferRef.current.length === TOTAL_FRAMES) {
          const framesToPredict = [...frameBufferRef.current];
          frameBufferRef.current = [];
          setFrameCount(0);
          isProcessingRef.current = true;
          setLoading(true);
          await sendFramesToBackend(framesToPredict);
          setLoading(false);
          isProcessingRef.current = false;
        }
      }
    } catch (err) {
      console.error("Error during webcam prediction", err);
    }

    rafRef.current = requestAnimationFrame(predictWebcam);
  };

  const processQueue = () => {
    if (predictionQueueRef.current.length > 0 && processingCountRef.current < MAX_CONCURRENT_REQUESTS) {
      const framesToSend = predictionQueueRef.current.shift();
      setPendingFrames(predictionQueueRef.current.length);

      processingCountRef.current++;
      setLoading(true);

      sendFramesToBackend(framesToSend).finally(() => {
        processingCountRef.current--;
        if (processingCountRef.current === 0) setLoading(false);
        if (predictionQueueRef.current.length > 0) processQueue();
      });
    }
  };

  const sendFramesToBackend = async (frames) => {
    try {
      const response = await fetch("https://6z2fcgk8-5000.inc1.devtunnels.ms/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frames),
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const data = await response.json();
      setPrediction(data.word);

      const timestamp = new Date().toLocaleTimeString();
      setAllPredictions((prev) => {
        const updated = [
          ...prev,
          { prediction: data.word, confidence: data.confidence, timestamp },
        ];
        return updated.slice(-3);
      });

    } catch (err) {
      console.error("Prediction error:", err);
      setError("Prediction failed: " + err.message);
    }
  };

  return (
    <div className="live-predictor-container">
      <h1 className="page-title">Live Sign Language Recognition</h1>

      <div className="video-prediction-container">
        <div className="video-container">
          <video ref={videoRef} className="video-feed" autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }} />

          {isRecording && (
            <div className="countdown-timer">
              Capturing: {frameCount} frames
              {pendingFrames > 0 && <span> | Queued batches: {pendingFrames}</span>}
              {loading && <span> | Processing...</span>}
            </div>
          )}

          <div className="controls">
            {!isActive ? (
              <button className="control-button start-button" onClick={startContinuousRecording}>
                Start Continuous Recognition
              </button>
            ) : (
              <button className="control-button stop-button" onClick={stopContinuousRecording}>
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
            <div className="prediction-result">{prediction}</div>
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
            {allPredictions.map((item, index) => (
              <div key={index} className="prediction-item">
                <span className="prediction-time">{item.timestamp}</span>
                <span className="prediction-text">
                  {item.prediction}
                  {item.confidence && (
                    <span className="confidence">({(item.confidence * 100).toFixed(1)}%)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-history">No predictions recorded yet</p>
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

export default LivePredictor;
