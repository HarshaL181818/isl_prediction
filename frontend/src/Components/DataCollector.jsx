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

  // If handedness info is provided, choose color accordingly
  console.log(opts);
  if (opts.handedness === 'Left') {
    color = '#00FF00'; // green for left hand
  } else if (opts.handedness === 'Right') {
    color = '#0000FF'; // blue for right hand
  }

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
  const canvasRef = useRef(null); // overlay for webcam
  const containerRef = useRef(null);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const runningModeRef = useRef('IMAGE');
  const webcamRunningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const rafRef = useRef(null);

  // --- Load MediaPipe Tasks (HandLandmarker) dynamically on mount ---
  useEffect(() => {
    let mounted = true;
    let createdHL = null;

    (async () => {
      try {
        // dynamic import from CDN
        const mp = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0');
        const { FilesetResolver, HandLandmarker } = mp;

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

        if (!mounted) {
          if (createdHL && createdHL.close) createdHL.close();
          return;
        }

        setHandLandmarker(createdHL);
        // Reveal that the model is ready in console
        console.info('HandLandmarker ready');
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
    };
  }, []);

  // --- Image click detection handler ---
  const handleImageClick = async (e) => {
    if (!handLandmarker) {
      console.warn('Model not ready yet');
      return;
    }

    const img = e.currentTarget; // wrapper div (we attach listener to wrapper)
    const imageEl = img.querySelector('img');

    try {
      // switch to IMAGE mode if necessary
      if (runningModeRef.current === 'VIDEO') {
        runningModeRef.current = 'IMAGE';
        await handLandmarker.setOptions({ runningMode: 'IMAGE' });
      }

      // remove any previous overlay canvases for this wrapper
      const previous = img.querySelector('.mp-overlay-canvas');
      if (previous) previous.remove();

      // create overlay canvas sized to displayed img
      const canvas = document.createElement('canvas');
      canvas.className = 'mp-overlay-canvas';
      // use natural size for drawing accuracy, but style to fit element
      canvas.width = imageEl.naturalWidth || imageEl.width;
      canvas.height = imageEl.naturalHeight || imageEl.height;
      canvas.style.position = 'absolute';
      canvas.style.left = '0px';
      canvas.style.top = '0px';
      canvas.style.width = imageEl.clientWidth + 'px';
      canvas.style.height = imageEl.clientHeight + 'px';
      canvas.style.pointerEvents = 'none';
      img.appendChild(canvas);

      // detect on the clicked image
      const result = await handLandmarker.detect(imageEl);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (result && result.landmarks) {
        // draw all detected hands
        for (const landmarks of result.landmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
          drawLandmarks(ctx, landmarks, { color: '#FF0000', radius: 4 });
        }
      } else {
        console.info('No hands detected');
      }
    } catch (err) {
      console.error('Error running detection on image', err);
    }
  };

  // --- Webcam control ---
  const toggleWebcam = async () => {
    if (!handLandmarker) {
      console.warn('Model not loaded yet');
      return;
    }

    if (webcamRunningRef.current) {
      // stop
      webcamRunningRef.current = false;
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
        // start loop
        rafRef.current = requestAnimationFrame(predictWebcam);
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
      }

      const startTimeMs = performance.now();

      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        // detectForVideo may be synchronous in some builds but awaiting is safe
        const res = await handLandmarker.detectForVideo(video, startTimeMs);
        // draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (res && res.landmarks) {
          console.log(res)
          for(var i = 0 ; i < res.handednesses.length ; i++)
          {
              const category = res.handednesses[i];
              console.log(category[0].categoryName)
              if(category[0].categoryName == "Left")
                {
                  
                    drawConnectors(ctx, res.landmarks[i], HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                    drawLandmarks(ctx, res.landmarks[i], { color: '#FF0000', radius: 3 });
                   
                }
                else if(category[0].categoryName == "Right")
                {
                    drawConnectors(ctx, res.landmarks[i], HAND_CONNECTIONS, { color: '#6600ffff', lineWidth: 5 });
                    drawLandmarks(ctx, res.landmarks[i], { color: '#0a0a0aff', radius: 3 });
                    
                }
            
          }
          
          
          
        }
      }
    } catch (err) {
      console.error('Error during webcam prediction', err);
    }

    // continue loop
    rafRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div ref={containerRef} className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Hand landmark detection (React)</h2>

      

      <section>
        <h3 className="font-medium">Demo: Webcam continuous hand landmark detection</h3>
        <p className="text-sm">Click the button and allow webcam access.</p>
        <div className="mt-2">
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={toggleWebcam}
          >
            {webcamRunningRef.current ? 'Disable Webcam' : 'Enable Webcam'}
          </button>
        </div>

        <div className="mt-4" style={{ position: 'relative', width: '100%', maxWidth: 960 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ display: 'block', width: '100%' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
        </div>
      </section>

      <p className="mt-4 text-xs text-gray-500">Note: the component dynamically loads MediaPipe Tasks from CDN. If your bundler blocks remote ESM imports, either run this in a development server that allows dynamic ESM imports or include the official script in your public/index.html and adapt the loader accordingly.</p>
    </div>
  );
}
