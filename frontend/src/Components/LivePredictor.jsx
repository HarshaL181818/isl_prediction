import React, { useState, useRef, useEffect } from 'react';
import './LivePredictor.css';

const LivePredictor = () => {
  const [prediction, setPrediction] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allPredictions, setAllPredictions] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [pendingFrames, setPendingFrames] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const framesRef = useRef([]);
  const frameCapturerRef = useRef(null);
  const contextRef = useRef(null);
  const predictionQueueRef = useRef([]);
  const processingCountRef = useRef(0);

  // Constants
  const FRAME_RATE = 27.5; // to capture frames at proper rate
  const TOTAL_FRAMES = 110; // Number of frames we need for prediction
  const MAX_CONCURRENT_REQUESTS = 3; // Maximum number of parallel prediction requests

  useEffect(() => {
    // Set up canvas once
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext('2d');
    }
    
    return () => {
      stopCamera();
      if (frameCapturerRef.current) {
        clearInterval(frameCapturerRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setPrediction(null);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Set canvas dimensions to match video
      if (canvasRef.current) {
        canvasRef.current.width = 320;
        canvasRef.current.height = 240;
      }
      
      return true;
    } catch (err) {
      console.error('Webcam error:', err);
      setError('Could not access webcam.');
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startContinuousRecording = async () => {
    const cameraStarted = await startCamera();
    if (!cameraStarted) return;

    setIsActive(true);
    setAllPredictions([]);
    framesRef.current = [];
    predictionQueueRef.current = [];
    processingCountRef.current = 0;
    setFrameCount(0);
    setPendingFrames(0);
    
    // Start capturing frames
    const frameInterval = 1000 / FRAME_RATE; // milliseconds between frames
    frameCapturerRef.current = setInterval(captureFrame, frameInterval);
    setIsRecording(true);
  };

  const captureFrame = () => {
    if (!contextRef.current || !videoRef.current || !canvasRef.current) return;
    
    contextRef.current.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Get the frame data as a data URL
    const frameDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    framesRef.current.push(frameDataUrl);
    
    // Update frame count display
    setFrameCount(framesRef.current.length);
    
    // If we have enough frames for prediction, add them to prediction queue
    if (framesRef.current.length >= TOTAL_FRAMES) {
      const framesToPredict = framesRef.current.slice(0, TOTAL_FRAMES);
      framesRef.current = framesRef.current.slice(TOTAL_FRAMES); // Keep any extra frames
      
      // Add frames to prediction queue
      predictionQueueRef.current.push(framesToPredict);
      setPendingFrames(predictionQueueRef.current.length);
      
      // Process prediction queue
      processQueue();
      
      // Reset the frame counter for the new batch
      setFrameCount(framesRef.current.length);
    }
  };
  
  const processQueue = () => {
    // If we have pending predictions and capacity to handle more
    if (predictionQueueRef.current.length > 0 && processingCountRef.current < MAX_CONCURRENT_REQUESTS) {
      const framesToSend = predictionQueueRef.current.shift();
      setPendingFrames(predictionQueueRef.current.length);
      
      // Increment processing counter
      processingCountRef.current++;
      setLoading(true);
      
      // Send frames for prediction
      sendFramesToBackend(framesToSend)
        .finally(() => {
          // Decrement processing counter when done
          processingCountRef.current--;
          
          // If no more requests in progress, clear loading state
          if (processingCountRef.current === 0) {
            setLoading(false);
          }
          
          // Process next batch if any
          if (predictionQueueRef.current.length > 0) {
            processQueue();
          }
        });
    }
  };
  
  const sendFramesToBackend = async (frames) => {
    try {
      const formData = new FormData();
      
      // Add each frame as a separate field
      frames.forEach((frame, index) => {
        // Convert data URL to blob
        const blob = dataURLToBlob(frame);
        formData.append(`frame_${index}`, blob, `frame_${index}.jpg`);
      });
      
      formData.append('frame_count', frames.length);
      
      console.log(`Sending batch of ${frames.length} frames for prediction`);
      
      const response = await fetch('http://localhost:5000/predict-frames', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      setPrediction(data.predicted_label);
      
      const timestamp = new Date().toLocaleTimeString();
      setAllPredictions(prev => [...prev, {
        prediction: data.predicted_label,
        confidence: data.confidence,
        timestamp
      }]);

      console.log(`Received prediction: ${data.predicted_label} (${data.confidence})`);
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Prediction failed: ' + err.message);
    }
  };
  
  // Helper function to convert data URL to Blob
  const dataURLToBlob = (dataURL) => {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  };

  const stopContinuousRecording = () => {
    setIsActive(false);
    if (frameCapturerRef.current) {
      clearInterval(frameCapturerRef.current);
      frameCapturerRef.current = null;
    }
    stopCamera();
    setIsRecording(false);
    framesRef.current = [];
    predictionQueueRef.current = [];
    processingCountRef.current = 0;
    setFrameCount(0);
    setPendingFrames(0);
  };

  return (
    <div className="live-predictor-container">
      <h1 className="page-title">Live Sign Language Recognition</h1>

      <div className="video-prediction-container">
        <div className="video-container">
          <video ref={videoRef} className="video-feed" autoPlay playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {isRecording && (
            <div className="countdown-timer">
              Capturing: {frameCount} frames
              {pendingFrames > 0 && <span> | Queued batches: {pendingFrames}</span>}
              {loading && <span> | Processing...</span>}
            </div>
          )}

          <div className="controls">
            {!isActive ? (
              <button 
                className="control-button start-button" 
                onClick={startContinuousRecording}
              >
                Start Continuous Recognition
              </button>
            ) : (
              <button 
                className="control-button stop-button" 
                onClick={stopContinuousRecording}
              >
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
                  {item.confidence && <span className="confidence">({(item.confidence * 100).toFixed(1)}%)</span>}
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