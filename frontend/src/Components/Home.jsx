// Components/Home.js
import React, { useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState("");
  const [multiResult, setMultiResult] = useState("");
  const [generatedSentence, setGeneratedSentence] = useState("");
  const [elapsedTime, setElapsedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [multiLoading, setMultiLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const multipleFileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult("");
      setError("");
    }
  };

  const handleFilesChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    setMultiResult("");
    setGeneratedSentence("");
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a video file first.");
      return;
    }

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await axios.post("http://localhost:5000/predict-sign", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const cleanedResult = cleanPrediction(response.data.label);
      setResult(cleanedResult);
    } catch (error) {
      console.error(error);
      setError("Error in prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMultipleUploads = async () => {
    if (files.length === 0) {
      setError("Please select video files first.");
      return;
    }

    setMultiLoading(true);
    setError("");
    const startTime = Date.now();
    setElapsedTime(null);

    let predictions = "";
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("video", files[i]);

        const response = await axios.post("http://localhost:5000/predict-sign", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        const cleanedPrediction = cleanPrediction(response.data.label);
        predictions += cleanedPrediction + " ";
      }

      const finalWords = predictions.trim();
      setMultiResult(finalWords);

      // Call generate sentence automatically
      const formData = new FormData();
      formData.append("words", finalWords);

      const response = await axios.post("http://localhost:5000/generate_context", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setGeneratedSentence(response.data.generated_sentence);
    } catch (error) {
      console.error(error);
      setError("Error in prediction or sentence generation.");
    } finally {
      const endTime = Date.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);
      setElapsedTime(totalTime);
      setMultiLoading(false);
    }
  };

  const handleClearSelection = () => {
    setFiles([]);
    setMultiResult("");
    setGeneratedSentence("");
    setElapsedTime(null);
    if (multipleFileInputRef.current) {
      multipleFileInputRef.current.value = '';
    }
  };

  const handleResetSingle = () => {
    setFile(null);
    setResult("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cleanPrediction = (prediction) => {
    return prediction.replace(/\d+\.\s*/g, "").trim();
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Indian Sign Language Recognition</h1>
          <p className="hero-description">
            Breaking communication barriers with AI-powered sign language recognition. 
            Upload videos of sign language gestures and get real-time predictions and sentence generation.
          </p>
          <div className="hero-buttons">
            <Link to="/dataset" className="btn btn-primary">Explore Dataset</Link>
            <a href="#upload-section" className="btn btn-secondary">Try Now</a>
          </div>
        </div>
        <div className="hero-image">
          <div className="sign-language-icon">🤟</div>
        </div>
      </section>

      <section id="upload-section" className="features-section">
        <h2>Start Recognizing Sign Language</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📹</div>
            <h3>Upload Videos</h3>
            <p>Upload sign language videos for recognition</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Get Predictions</h3>
            <p>Our AI model predicts the signs accurately</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Generate Sentences</h3>
            <p>Convert multiple signs into meaningful sentences</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="upload-cards-container">
        {/* Single video upload card */}
        <div className="upload-card">
          <h3>Single Sign Recognition</h3>
          <div className="file-input-container">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange} 
              ref={fileInputRef}
              id="single-file-input"  
              className="file-input"
            />
            <label htmlFor="single-file-input" className="file-input-label">
              {file ? file.name : "Choose Video"}
            </label>
            {file && (
              <button className="file-clear-btn" onClick={handleResetSingle}>
                ×
              </button>
            )}
          </div>
          
          <div className="action-buttons">
            <button 
              onClick={handleUpload} 
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Predicting...
                </>
              ) : "Predict Sign"}
            </button>
          </div>
          
          {result && (
            <div className="result-container">
              <h4>Predicted Sign:</h4>
              <div className="prediction-result">{result}</div>
            </div>
          )}
        </div>

        {/* Multiple video upload card */}
        <div className="upload-card">
          <h3>Multiple Signs to Sentence</h3>
          <div className="file-input-container">
            <input 
              type="file" 
              accept="video/*" 
              multiple 
              onChange={handleFilesChange} 
              ref={multipleFileInputRef}
              id="multiple-file-input"
              className="file-input"
            />
            <label htmlFor="multiple-file-input" className="file-input-label">
              {files.length > 0 ? `${files.length} videos selected` : "Choose Videos"}
            </label>
          </div>
          
          {files.length > 0 && (
            <div className="selected-files">
              <h4>Selected Videos:</h4>
              <ul className="files-list">
                {files.map((file, index) => (
                  <li key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button 
                      className="remove-file-btn" 
                      onClick={() => removeFile(index)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="action-buttons">
            <button 
              onClick={handleMultipleUploads} 
              className={`btn btn-primary ${multiLoading ? 'loading' : ''}`}
              disabled={multiLoading || files.length === 0}
            >
              {multiLoading ? (
                <>
                  <span className="spinner-small"></span>
                  Processing...
                </>
              ) : "Generate Predictions"}
            </button>
            <button 
              onClick={handleClearSelection} 
              className="btn btn-secondary"
              disabled={multiLoading || files.length === 0}
            >
              Clear All
            </button>
          </div>
          
          {multiResult && (
            <div className="result-container">
              <h4>Predicted Signs:</h4>
              <div className="prediction-result">{multiResult}</div>
              
              {generatedSentence && (
                <>
                  <h4>Generated Sentence:</h4>
                  <div className="generated-sentence">{generatedSentence}</div>
                </>
              )}
              
              {elapsedTime && (
                <div className="elapsed-time">
                  Time taken: {elapsedTime} seconds
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;