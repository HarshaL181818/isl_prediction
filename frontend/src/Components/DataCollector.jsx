// DataCollector.jsx
// React component that reproduces the MediaPipe HandLandmarker demo (image click detection + webcam continuous detection)
// - No external npm packages required (uses dynamic import of MediaPipe Tasks from CDN)
// - Drop this file in your React app (must run in a modern browser that allows dynamic ESM imports from CDN)
// Usage: import DataCollector from './DataCollector'; then use <DataCollector /> in your app

import React, { useEffect, useRef, useState } from 'react';

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
  const keepListeningRef = useRef(true);
  const labelRef = useRef(label);
  const recordedDataRef = useRef({});

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
    let cleanLabel = label.replace(" (new)", ""); // remove suffix if chosen
    if (cleanLabel !== label) {
      setLabel(cleanLabel);
    }

    const match = words.find(
      (w) => w.label.toLowerCase() === cleanLabel.toLowerCase()
    );

    if (match) {
      setLink(match.link || "");
    }
    // don't reset link if it's new
  }, [label, words]);


  useEffect(() => {
    let mounted = true;
    let createdHL = null;
    let createdPL = null;

    (async () => {
      try {
        // dynamic import from CDN
        const mp = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0');
        const { FilesetResolver, HandLandmarker, PoseLandmarker } = mp;

        // load wasm files for the tasks
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        createdHL = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            // model hosted by MediaPipe
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            // if GPU fails for you, replace with 'CPU'
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
          if (createdHL && createdHL.close) 
            createdHL.close();
          if (createdPL && createdPL.close) 
            createdPL.close();
          return;
        }

        setHandLandmarker(createdHL);
        console.info('HandLandmarker ready');
        setPoseLandmarker(createdPL);
        console.info('PoseLandmarker ready')
        // Reveal that the model is ready in console
        
      } catch (err) {
        console.error('Failed to load MediaPipe HandLandmarker', err);
      }
    })();

    return () => {
      mounted = false;
      // stop webcam if running
      webcamRunningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (createdHL && createdHL.close) createdHL.close();
      if (createdPL && createdPL.close) 
            createdPL.close();
    };
  }, []);

  // --- Webcam control ---
  const toggleWebcam = async () => {
    if (!handLandmarker) {
      console.warn('Model not loaded yet');
      return;
    }

    if (webcamRunningRef.current) {
      // stop
      webcamRunningRef.current = false;
      setIsWebcamReady(false);
      keepListeningRef.current = false;
      if(recognitionRef.current) recognitionRef.current.stop();
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        // ensure video plays
        await videoRef.current.play();
        webcamRunningRef.current = true;
        setIsWebcamReady(true);
        // start loop
        rafRef.current = requestAnimationFrame(predictWebcam);

        if(recognitionRef.current){
          keepListeningRef.current = true;
          recognitionRef.current.start();
          console.log("Voice command enabled");
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

    // match size
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
        // detectForVideo may be synchronous in some builds but awaiting is safe
        const [handRes, poseRes] = await Promise.all([
          handLandmarker.detectForVideo(video, startTimeMs),
          poseLandmarker.detectForVideo(video, startTimeMs)
        ]);
        // draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (handRes && handRes.landmarks) {
          for(let i = 0 ; i < handRes.handednesses.length ; i++)
          {
              const category = handRes.handednesses[i];
              if(category[0].categoryName === "Left")
                {
                    leftHand = handRes.landmarks[i];
                    drawConnectors(ctx, handRes.landmarks[i], HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                    drawLandmarks(ctx, handRes.landmarks[i], { color: '#FF0000', radius: 3 });
                   
                }
                else if(category[0].categoryName === "Right")
                {
                    rightHand = handRes.landmarks[i];
                    drawConnectors(ctx, handRes.landmarks[i], HAND_CONNECTIONS, { color: '#6600ffff', lineWidth: 5 });
                    drawLandmarks(ctx, handRes.landmarks[i], { color: '#0a0a0aff', radius: 3 });
                    
                }
            
          }
        }

        if (poseRes && poseRes.landmarks) {
            pose = poseRes.landmarks[0];
            drawConnectors(ctx, pose, POSE_CONNECTIONS, { color: '#00FFFF', lineWidth: 2 });
            drawLandmarks(ctx, pose, { color: '#FF00FF', radius: 3 });
        }
        
       // inside predictWebcam after detection
        leftHandRef.current = null;
        rightHandRef.current = null;
        poseRef.current = null;

        if (handRes && handRes.landmarks) {
          for (let i = 0; i < handRes.handednesses.length; i++) {
            const category = handRes.handednesses[i];
            if (category[0].categoryName === "Left") {
              leftHandRef.current = handRes.landmarks[i];
            } else if (category[0].categoryName === "Right") {
              rightHandRef.current = handRes.landmarks[i];
            }
          }
        }

        if (poseRes && poseRes.landmarks) {
          poseRef.current = poseRes.landmarks[0];
        }

        // save frame-wise data
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

    // continue loop
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

    // ✅ Clear old frames for this new recording
    recordedDataRef.current = { [labelRef.current]: [] };

    setRecordedData({ [labelRef.current]: [] });
    isRecordingRef.current = true;
    setIsRecording(true);
    console.log("Recording started for:", labelRef.current);
  };



  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);
  const poseRef = useRef(null);

  const stopRecording = async () => {
    if(!isRecordingRef.current) return;
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
    console.log(isRecording);
  };
  useEffect(() => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("❌ SpeechRecognition not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognitionRef.current = recognition;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript
      .trim()
      .toLowerCase();
    console.log("🎤 Heard:", transcript);

    if (transcript.includes("start")) {
      startRecording();
    } else if (transcript.includes("stop")) {
      stopRecording();
    }
  };

  recognition.onerror = (e) => {
    console.error("⚠️ Speech error:", e);
    if (e.error === "no-speech") {
      console.log("No speech detected, restarting...");
      recognition.stop();
      if (keepListeningRef.current) {
        setTimeout(() => recognition.start(), 500);
      }
    }
  };

  recognition.onend = () => {
    console.log("🔄 Recognition ended");
    if (keepListeningRef.current) {
      console.log("▶️ Restarting recognition...");
      recognition.start();
    }
  };

  return () => {
    keepListeningRef.current = false;
    recognition.stop();
  };
}, []);

  return (
    <div ref={containerRef} className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Hand landmark detection (React)</h2>

      
      {/* Input + recording controls */}
      <div className="flex gap-2 items-center mb-3">
        <input
          type="text"
          list="word-options"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Enter label/word"
          className="border px-2 py-1 rounded"
        />

        <datalist id="word-options">
          {words.map((w) => (
            <option key={w.label} value={w.label} />
          ))}
          {/* If current label isn't already in words, show a "(new)" option */}
          {label && !words.some((w) => w.label.toLowerCase() === label.toLowerCase()) && (
            <option value={label + " (new)"} />
          )}
        </datalist>

        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Enter link"
          className="border px-2 py-1 rounded"
        />
        <button
          className={`px-4 py-2 rounded ${isRecording ? "bg-gray-500" : "bg-green-600 text-white"}`}
          onClick={startRecording}
          disabled={isRecording}
        >
        {existingWord && (
          <div className="ml-2 text-sm text-blue-600">
            Already exists:{" "}
            <a
              href={existingWord.link}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {existingWord.link}
            </a>
          </div>
        )}
          Start
        </button>
        <button
          className="px-4 py-2 rounded bg-red-600 text-white"
          onClick={stopRecording}
          disabled={!isRecording}
        >
          Stop
        </button>

      </div>

      <section>
        <h3 className="font-medium">Demo: Webcam continuous hand landmark detection</h3>
        <p className="text-sm">Click the button and allow webcam access.</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={toggleWebcam}
          >
            {webcamRunningRef.current ? 'Disable Webcam' : 'Enable Webcam'}
          </button>

          {isWebcamReady ? (
            <span className="text-green-600">🎤 Listening...</span>
          ) : (
            <span className="text-gray-500">Waiting for webcam...</span>
          )}
        </div>


        <div className="mt-4" style={{ position: 'relative', width: '100%', maxWidth: 960 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ display: 'block', width: '100%' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
        </div>
      </section>

    </div>
  );
}
