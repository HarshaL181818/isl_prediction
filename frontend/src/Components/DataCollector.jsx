import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const DataCollector = () => {
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const landmarksRef = useRef(null);
  const animationFrameId = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));

  const drawLandmarks = (ctx, landmarks, color) => {
    if (!landmarks) return;
    ctx.fillStyle = color;
    landmarks.forEach(lm => {
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawPolyline = (ctx, landmarks, color) => {
    if (!landmarks || landmarks.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(landmarks[0].x, landmarks[0].y);
    for (let i = 1; i < landmarks.length; i++) {
      ctx.lineTo(landmarks[i].x, landmarks[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = color;
    landmarks.forEach(lm => {
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const renderLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const landmarks = landmarksRef.current;
    if (landmarks) {
      drawPolyline(ctx, landmarks.left_hand, '#00FF00');  // green
      drawPolyline(ctx, landmarks.right_hand, '#0000FF'); // blue
      drawLandmarks(ctx, landmarks.pose, '#FF0000');       // red
    }

    animationFrameId.current = requestAnimationFrame(renderLoop);
  };

  const sendFrameLoop = () => {
    const video = videoRef.current;
    const socket = socketRef.current;
    if (!video || !socket) return;

    const canvas = offscreenCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        socket.emit('frame', blob);
      }
    }, 'image/jpeg', 0.5); // quality: 0.5

    setTimeout(sendFrameLoop, 66); // ~15fps
  };

  useEffect(() => {
    if (isActive) {
      console.log("Starting data collection...");

      socketRef.current = io('http://localhost:5000', {
        transports: ['websocket'],
        upgrade: false,
      });
      socketRef.current.binaryType = 'arraybuffer';

      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then(stream => {
          const video = videoRef.current;
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play();
            requestAnimationFrame(renderLoop);
            sendFrameLoop();
          };
        })
        .catch(err => {
          console.error("Error accessing webcam:", err);
          alert("Could not access camera");
          setIsActive(false);
        });

      socketRef.current.on('processed_frame', (data) => {
        landmarksRef.current = data;
      });

    } else {
      console.log("Stopping data collection...");
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Data Collector</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h4>Raw Video</h4>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            width="0"
            height="0"
            style={{ border: '2px solid #999', borderRadius: '8px' }}
          />
        </div>
        <div>
          <h4>Landmarked Video</h4>
          <canvas
            ref={canvasRef}
            width="320"
            height="240"
            style={{ border: '2px solid #333', borderRadius: '8px' }}
          />
        </div>
      </div>

      <button
        onClick={() => setIsActive(!isActive)}
        style={{ marginTop: '40px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        {isActive ? 'Stop Collection' : 'Start Collection'}
      </button>
    </div>
  );
};

export default DataCollector;
