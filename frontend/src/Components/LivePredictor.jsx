import React, { useState, useRef, useEffect } from 'react';
import './LivePredictor.css';

const LivePredictor = () => {
  const [prediction, setPrediction] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [allPredictions, setAllPredictions] = useState([]);
  const [isActive, setIsActive] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const countdownIntervalRef = useRef(null);
  const recordingSessionRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
      clearAllIntervals();
    };
  }, []);

  const clearAllIntervals = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    if (recordingSessionRef.current) {
      clearInterval(recordingSessionRef.current);
      recordingSessionRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setPrediction(null);
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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
    
    // Start the first recording
    startSingleRecording();
    
    // Set up interval for continuous recordings
    recordingSessionRef.current = setInterval(() => {
      startSingleRecording();
    }, 4000); // 5s recording + 1s buffer for processing
  };

  const startSingleRecording = () => {
    setIsRecording(true);
    setCountdown(3);
    recordedChunksRef.current = [];
  
    // Countdown runs for 3 seconds
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
  
    const options = { mimeType: 'video/webm' };
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
  
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
  
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
  
        // Log the size of the video blob (in bytes)
        console.log('Received video length:', blob.size, 'bytes');
        
        const formData = new FormData();
        formData.append('video', blob, 'clip.webm');
  
        // Don't block recording cycle, call async function
        processPrediction(formData);
      };
  
      mediaRecorder.start();
  
      // Stop recording after exactly 3s
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        setIsRecording(false);  // Ensure recording state ends exactly after 3s
      }, 3000);
  
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setError('Recording failed. Your browser may not support this feature.');
      setIsRecording(false);
      clearInterval(countdownIntervalRef.current);
    }
  };
  
  
  const processPrediction = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/predict-live', {
        method: 'POST',
        body: formData,
      });
  
      const data = await response.json();
      setPrediction(data.predicted_label);
  
      const timestamp = new Date().toLocaleTimeString();
      setAllPredictions(prev => [...prev, {
        prediction: data.predicted_label,
        timestamp
      }]);
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Prediction failed.');
    }
  };
  

  const stopContinuousRecording = () => {
    setIsActive(false);
    clearAllIntervals();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    stopCamera();
    setIsRecording(false);
  };

  return (
    <div className="live-predictor-container">
      <h1 className="page-title">Live Sign Language Recognition</h1>

      <div className="video-prediction-container">
        <div className="video-container">
          <video ref={videoRef} className="video-feed" autoPlay playsInline />
          
          {isRecording && (
            <div className="countdown-timer">
              Recording: {countdown}s
            </div>
          )}

          <div className="controls">
            {!isActive ? (
              <button 
                className="control-button start-button" 
                onClick={startContinuousRecording}
              >
                Start Continuous Recording
              </button>
            ) : (
              <button 
                className="control-button stop-button" 
                onClick={stopContinuousRecording}
              >
                Stop Recording
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
                <span className="prediction-text">{item.prediction}</span>
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
          <li>Click "Start Continuous Recording" to activate webcam</li>
          <li>Perform your sign during the 5-second countdown periods</li>
          <li>Watch predictions appear in the history list</li>
          <li>Click "Stop Recording" when finished</li>
        </ol>
        <p className="note">Tip: Make sure your hands are clearly visible and well-lit.</p>
      </div>
    </div>
  );
};

export default LivePredictor;