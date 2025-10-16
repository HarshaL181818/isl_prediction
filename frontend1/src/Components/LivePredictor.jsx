import React, { useState, useRef, useEffect } from 'react';
import { Video, StopCircle, PlayCircle, Activity, Clock, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';


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
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white pt-24 pb-12">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Page Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full text-sm mb-6">
            <Video className="w-4 h-4 text-blue-300" />
            <span>Live AI Interpretation</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Real-time Medical Sign Interpretation
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto">
            Continuous AI-powered recognition for seamless patient-doctor communication
          </p>
        </div>

        {/* Video and Prediction Container */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Video Container */}
          <div className="lg:col-span-2">
            <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="relative aspect-video bg-gradient-to-br from-blue-900/20 to-purple-900/20">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  autoPlay 
                  playsInline 
                  muted 
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute left-0 top-0 pointer-events-none w-full h-full"
                />

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-xl">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">LIVE</span>
                    </div>
                    
                    <div className="px-4 py-3 bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-xl">
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4" />
                        <span>{frameCount} frames</span>
                      </div>
                      {pendingFrames > 0 && (
                        <div className="text-xs text-blue-300 mt-1">
                          Queued: {pendingFrames}
                        </div>
                      )}
                      {loading && (
                        <div className="text-xs text-purple-300 mt-1 flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Analyzing...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Placeholder when not active */}
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-sm">
                    <div className="text-center">
                      <Video className="w-20 h-20 text-blue-300/50 mx-auto mb-4" />
                      <p className="text-blue-200/60">Camera feed will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                {!isActive ? (
                  <button 
                    onClick={startContinuousRecording}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Start Live Medical Recognition
                  </button>
                ) : (
                  <button 
                    onClick={stopContinuousRecording}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
                  >
                    <StopCircle className="w-5 h-5" />
                    Stop Live Interpretation
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Current Prediction Display */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Current Interpretation</h2>
              </div>

              <div className="min-h-[200px] flex items-center justify-center">
                {loading ? (
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-300">Analyzing Patient Signs...</p>
                  </div>
                ) : prediction ? (
                  <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-400/30 rounded-2xl w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-sm font-semibold text-green-200">Detected</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{prediction}</p>
                  </div>
                ) : (
                  <div className="text-center text-blue-300/50">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No interpretation yet</p>
                    <p className="text-sm mt-2">Start recognition to begin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl text-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Prediction History */}
        <div className="mb-12 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold">Medical Dialogue History</h2>
          </div>

          {allPredictions.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {allPredictions.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/30 hover:bg-white/10 transition-all group"
                >
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2 group-hover:scale-150 transition-transform"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-blue-300 font-mono">{item.timestamp}</span>
                      {item.confidence && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full">
                          {(item.confidence * 100).toFixed(1)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium">{item.prediction}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-blue-300/50">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No medical interpretations recorded yet</p>
              <p className="text-sm mt-2">Start the live recognition to begin tracking</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-3xl border border-blue-400/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold">How to use for Patient Consultations</h3>
          </div>

          <ol className="space-y-4 mb-6">
            {[
              'Click "Start Live Medical Recognition" to activate webcam.',
              'Encourage patients to perform signs continuously.',
              'System will capture and process frames in batches.',
              'Multiple sign interpretations can be processed simultaneously.',
              'Monitor interpretations as they appear in the history list, aiding patient understanding.',
              'Click "Stop Live Interpretation" when the consultation is complete.'
            ].map((step, index) => (
              <li key={index} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <span className="text-blue-100 pt-1">{step}</span>
              </li>
            ))}
          </ol>

          <div className="p-4 bg-blue-500/20 rounded-xl border border-blue-400/30 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-100 mb-1">Pro Tip</p>
              <p className="text-blue-200/80">
                Ensure proper lighting and hand visibility for optimal recognition accuracy during consultations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .delay-1000 {
          animation-delay: 1000ms;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default LivePredictor;
