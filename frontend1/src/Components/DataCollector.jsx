// DataCollector.jsx
// React component that reproduces the MediaPipe HandLandmarker demo (image click detection + webcam continuous detection)
import { Camera, StopCircle, PlayCircle, Video, Link as LinkIcon, Database, Eye, CheckCircle, AlertCircle, Zap, FileVideo } from 'lucide-react';

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Typical MediaPipe hand connections used for drawing lines between landmarks
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
  let color = opts.color ?? '#FF0000';

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

export default function DataCollector() {
  const videoRef = useRef(null);
  let leftHand = null, rightHand = null, pose = null;
  const canvasRef = useRef(null); // overlay for webcam
  const containerRef = useRef(null);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const runningModeRef = useRef('IMAGE');
  const webcamRunningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const rafRef = useRef(null);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedData, setRecordedData] = useState({});
  const isRecordingRef = useRef(false);
  const [words, setWords] = useState([]);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const recognitionRef = useRef(null);
  const labelRef = useRef(label);
  const recordedDataRef = useRef({});
  const [sampleCounts, setSampleCounts] = useState({});
  const navigate = useNavigate();
  useEffect(() => {
    labelRef.current = label; // keep ref updated
  }, [label]);
  
  const updateLabel = (newLabel) => {
    setLabel(newLabel);
    console.log("Label should be:", newLabel);
  };
  
  useEffect(() => {
    fetch("http://localhost:5000/list_words")
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched words:", data);
        setWords(data);
      })
      .catch((err) => console.error("Failed to fetch words", err));
  }, []);

  const existingWord = words.find(
    (w) => w.label.toLowerCase() === label.toLowerCase()
  );

  useEffect(() => {
    let cleanLabel = label.replace(" (new)", "");
    if (cleanLabel !== label) {
      setLabel(cleanLabel);
    }

    const match = words.find(
      (w) => w.label.toLowerCase() === cleanLabel.toLowerCase()
    );

    if (match) {
      setLink(match.link || "");
    }
  }, [label, words]);

  useEffect(() => {
    let mounted = true;
    let createdHL = null;
    let createdPL = null;

    (async () => {
      try {
        const mp = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0');
        const { FilesetResolver, HandLandmarker, PoseLandmarker } = mp;

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        createdHL = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: runningModeRef.current,
          numHands: 2
        });
        createdPL = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: runningModeRef.current,
          numPoses: 1
        });

        if (!mounted) {
          if (createdHL?.close) createdHL.close();
          if (createdPL?.close) createdPL.close();
          return;
        }

        setHandLandmarker(createdHL);
        setPoseLandmarker(createdPL);
        console.info('Models ready');
      } catch (err) {
        console.error('Failed to load MediaPipe', err);
      }
    })();

    return () => {
      mounted = false;
      webcamRunningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (createdHL?.close) createdHL.close();
      if (createdPL?.close) createdPL.close();
    };
  }, []);

  // --- Webcam control ---
  const toggleWebcam = async () => {
    if (!handLandmarker) {
      console.warn('Model not loaded yet');
      return;
    }

    if (webcamRunningRef.current) {
      // === STOP ===
      webcamRunningRef.current = false;
      setIsWebcamReady(false);

      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.warn("Recognition stop error:", err);
      }

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        webcamRunningRef.current = true;
        setIsWebcamReady(true);

        rafRef.current = requestAnimationFrame(predictWebcam);

        try {
          recognitionRef.current?.start();
          console.log("🎤 Voice commands enabled");
        } catch (err) {
          console.error("Recognition start error:", err);
        }
      } catch (err) {
        console.error('Could not start webcam', err);
      }
    }
  };

  // --- predict loop for webcam ---
  const predictWebcam = async () => {
    if (!webcamRunningRef.current) return;
    if (!videoRef.current || !canvasRef.current) {
      rafRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.style.width = video.clientWidth + 'px';
      canvas.style.height = video.clientHeight + 'px';
    }

    try {
      if (runningModeRef.current === 'IMAGE') {
        runningModeRef.current = 'VIDEO';
        await handLandmarker.setOptions({ runningMode: 'VIDEO' });
        await poseLandmarker.setOptions({ runningMode: 'VIDEO' });
      }

      const startTimeMs = performance.now();

      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        const [handRes, poseRes] = await Promise.all([
          handLandmarker.detectForVideo(video, startTimeMs),
          poseLandmarker.detectForVideo(video, startTimeMs)
        ]);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

        leftHandRef.current = null;
        rightHandRef.current = null;
        poseRef.current = null;

        if (handRes?.landmarks) {
          for (let i = 0; i < handRes.handednesses.length; i++) {
            const category = handRes.handednesses[i];
            if (category[0].categoryName === "Left") {
              leftHandRef.current = handRes.landmarks[i];
            } else if (category[0].categoryName === "Right") {
              rightHandRef.current = handRes.landmarks[i];
            }
          }
        }

        if (poseRes?.landmarks) {
          poseRef.current = poseRes.landmarks[0];
        }

        if (isRecordingRef.current) {
          if (!recordedDataRef.current[labelRef.current]) {
            recordedDataRef.current[labelRef.current] = [];
          }
          recordedDataRef.current[labelRef.current].push({
            left: leftHandRef.current,
            right: rightHandRef.current,
            pose: poseRef.current,
            ts: Date.now()
          });
        }
      }
    } catch (err) {
      console.error('Error during webcam prediction', err);
    }

    rafRef.current = requestAnimationFrame(predictWebcam);
  };

  const startRecording = () => {
    if (isRecordingRef.current) return;
    if (!labelRef.current.trim()) {
      alert("Please enter a label/word first");
      return;
    }

    leftHandRef.current = null;
    rightHandRef.current = null;
    poseRef.current = null;

    recordedDataRef.current = { [labelRef.current]: [] };
    setRecordedData({ [labelRef.current]: [] });
    isRecordingRef.current = true;
    setIsRecording(true);
    console.log("Recording started for:", labelRef.current);
  };
  const fetchCounts = () => {
  fetch("http://localhost:5000/count_samples")
    .then(res => res.json())
    .then(data => {
      setSampleCounts(data);
      console.log("Sample counts:", data);
    })
    .catch(err => console.error("Failed to fetch counts", err));
};

useEffect(() => {
  fetchCounts();
}, []);
  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);
  const poseRef = useRef(null);

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    console.log("Recording stopped. Data:", recordedDataRef.current);
    const currentLabel = labelRef.current;
    const response = await fetch("http://localhost:5000/save_data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: currentLabel,
        samples: recordedDataRef.current[currentLabel] || [],
        link: link
      })
    });

    const result = await response.json();
    console.log("Saved:", result);

    fetchCounts();
  };

  // --- Voice Recognition ---
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("❌ SpeechRecognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      console.log("🎤 Heard:", transcript);

      if (transcript.includes("play")) {
        startRecording();
      } else if (transcript.includes("stop")) {
        stopRecording();
      }
    };

    recognition.onerror = (e) => {
      console.error("⚠️ Speech error:", e);
    };

    recognition.onend = () => {
      if (webcamRunningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.warn("⚠️ Recognition restart failed:", err);
        }
      }
    };

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);
  
  return (
       <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden -mx-[calc((100vw-100%)/2)]">{/* Animated background */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
  </div>

  <div ref={containerRef} className="container mx-auto px-6 relative z-10 mt-20">
    {/* Page Title */}
    <div className="text-center mb-12 animate-fade-in">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full text-sm mb-6">
        <Database className="w-4 h-4 text-green-300" />
        <span>Contribute to Training Dataset</span>
      </div>
      <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-200 via-emerald-200 to-blue-200 bg-clip-text text-transparent mb-4">
        Medical Sign Data Collection
      </h1>
      <p className="text-blue-200/60 text-lg max-w-2xl mx-auto">
        Help improve our AI model by recording medical sign language gestures
      </p>
    </div>

    {/* --- CHANGE START --- */}
    {/* 1. Added a Grid container to hold both columns. */}
    {/* It stacks on mobile (grid-cols-1) and goes side-by-side on large screens (lg:grid-cols-5). */}
    {/* `items-start` ensures columns align at the top. */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

      {/* 2. This is the new Controls Column (takes 2 of 5 grid columns on large screens) */}
      <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <FileVideo className="w-5 h-5" />
          </div>
          Recording Configuration
        </h3>

        {/* Input Section */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Medical Sign / Term
            </label>
            <input
              type="text"
              list="word-options"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter sign (e.g., Pain, Fever)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
            />
            <datalist id="word-options">
              {words.map((w) => (
                <option key={w.label} value={w.label} />
              ))}
              {label &&
                !words.some(
                  (w) => w.label.toLowerCase() === label.toLowerCase()
                ) && <option value={label + ' (new medical sign)'} />}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Reference Link (Optional)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enter reference link (e.g., YouTube)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-purple-400/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Unified Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          {/* Start */}
          <button
            onClick={startRecording}
            disabled={isRecording}
            className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Start
          </button>

          {/* Stop */}
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <StopCircle className="w-5 h-5" />
            Stop
          </button>

          {/* Webcam Toggle */}
          <button
            onClick={toggleWebcam}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 mt-2 ${
              webcamRunningRef.current
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-xl hover:shadow-red-500/50'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:shadow-blue-500/50'
            }`}
          >
            {webcamRunningRef.current ? (
              <>
                <StopCircle className="w-5 h-5" />
                Disable Webcam
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Enable Webcam
              </>
            )}
          </button>

          {/* View Data */}
          <button
            onClick={() => navigate('/view')}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 mt-2"
          >
            <Eye className="w-5 h-5" />
            View Data
          </button>
        </div>
      </div>


      {/* 3. This is the new Video Column (takes 3 of 5 grid columns on large screens) */}
      <div className="lg:col-span-3 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          {isWebcamReady ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-300">
                Capturing Gestures...
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/20 border border-gray-400/30 rounded-full">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-300">
                Waiting for webcam...
              </span>
            </div>
          )}
        </div>

        {/* Video + Canvas */}
        <div className="relative bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl overflow-hidden border border-white/10">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute left-0 top-0 w-full h-full pointer-events-none"
            />
            {!isWebcamReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm">
                <div className="text-center">
                  <Video className="w-20 h-20 text-purple-300/50 mx-auto mb-4" />
                  <p className="text-blue-200/60 text-lg mb-2">
                    Webcam Inactive
                  </p>
                  <p className="text-blue-300/40 text-sm">
                    Click "Enable Webcam" to start
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {/* --- CHANGE END --- */}
  </div>

  <style jsx>{`
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.8s ease-out;
    }

    .delay-1000 {
      animation-delay: 1000ms;
    }
  `}</style>
</div>

  );
}
