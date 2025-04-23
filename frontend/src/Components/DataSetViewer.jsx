// Components/DatasetViewer.js
import React, { useEffect, useState, useRef } from 'react';
import './DatasetViewer.css';

const DatasetViewer = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLabel, setExpandedLabel] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [thumbnails, setThumbnails] = useState({});
  const [stats, setStats] = useState({ totalSigns: 0, totalVideos: 0 });
  const [filteredCount, setFilteredCount] = useState(0);
  const [sortOrder, setSortOrder] = useState('alphabetical');

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/get-dataset-videos')
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        setData(data);
        
        // Calculate stats
        const totalSigns = Object.keys(data).length;
        const totalVideos = Object.values(data).reduce(
          (total, videos) => total + videos.length, 0
        );
        
        setStats({ totalSigns, totalVideos });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dataset:', err);
        setError('Failed to load videos. Please try again later.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Update filtered count whenever search term changes
    const filtered = Object.entries(data).filter(([label]) => 
      label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCount(filtered.length);
  }, [searchTerm, data]);

  const handleVideoClick = (videoUrl) => {
    setFullscreenVideo(videoUrl);
    // Reset prediction when opening a new video
    setPrediction(null);
  };

  const closeFullscreen = () => {
    setFullscreenVideo(null);
    setPrediction(null);
  };

  const toggleExpand = (label) => {
    if (expandedLabel === label) {
      setExpandedLabel(null);
    } else {
      setExpandedLabel(label);
    }
  };

  const expandAll = () => {
    // If search term is provided, expand all matching items
    if (searchTerm) {
      const firstMatchedLabel = Object.keys(data).find(label => 
        label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (firstMatchedLabel) {
        setExpandedLabel(firstMatchedLabel);
      }
    }
  };

  useEffect(() => {
    if (searchTerm) {
      expandAll();
    }
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateThumbnail = (videoRef) => {
    if (videoRef && videoRef.readyState >= 2) { // HAVE_CURRENT_DATA or further
      const videoSrc = videoRef.src;
      if (!thumbnails[videoSrc]) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.videoWidth;
        canvas.height = videoRef.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        setThumbnails(prev => ({ ...prev, [videoSrc]: thumbnailUrl }));
      }
    }
  };
  
  const handlePredictSign = async () => {
    if (!fullscreenVideo) return;
    
    setPredicting(true);
    setPrediction(null);
    
    try {
      const videoResponse = await fetch(fullscreenVideo);
      const videoBlob = await videoResponse.blob();
      
      // Create a File object from the blob
      const videoFile = new File([videoBlob], "video.mov", { type: "video/quicktime" });
      
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const response = await fetch('http://localhost:5000/predict-sign', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Prediction failed');
      }
      
      const result = await response.json();
      setPrediction(result.label);
    } catch (err) {
      console.error('Error predicting sign:', err);
      setPrediction('Error: Could not predict sign');
    } finally {
      setPredicting(false);
    }
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  // Sort the data based on the selected sort order
  const getSortedData = () => {
    const entries = Object.entries(data);
    
    if (sortOrder === 'alphabetical') {
      return entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sortOrder === 'video-count-asc') {
      return entries.sort((a, b) => a[1].length - b[1].length);
    } else if (sortOrder === 'video-count-desc') {
      return entries.sort((a, b) => b[1].length - a[1].length);
    }
    
    return entries;
  };

  const filteredData = getSortedData().filter(([label]) => 
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="dataset-container">
        <h1>Sign Language Dataset Viewer</h1>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading video dictionary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dataset-container">
        <h1>Sign Language Dataset Viewer</h1>
        <div className="error-message">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dataset-container">
      <h1>Sign Language Dataset Viewer</h1>
      
      <div className="dataset-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.totalSigns}</span>
          <span className="stat-label">Total Signs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.totalVideos}</span>
          <span className="stat-label">Total Videos</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{filteredCount}</span>
          <span className="stat-label">Filtered Signs</span>
        </div>
      </div>
      
      <div className="dataset-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search for signs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">🔍</div>
        </div>
        
        <div className="sort-container">
          <label htmlFor="sort-select">Sort by:</label>
          <select 
            id="sort-select" 
            value={sortOrder} 
            onChange={handleSortChange}
            className="sort-select"
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="video-count-asc">Video Count (Low to High)</option>
            <option value="video-count-desc">Video Count (High to Low)</option>
          </select>
        </div>
      </div>
      
      {filteredData.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <p>No signs found matching "{searchTerm}"</p>
          <button 
            className="btn btn-secondary"
            onClick={() => setSearchTerm('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="label-cards-container">
          {filteredData.map(([label, videos]) => (
            <div key={label} className="label-card">
              <div 
                className="label-header" 
                onClick={() => toggleExpand(label)}
              >
                <h2>{label}</h2>
                <div className="label-info">
                  <span className="video-count">{videos.length} videos</span>
                  <span className="expand-icon">{expandedLabel === label ? '▼' : '►'}</span>
                </div>
              </div>
              
              {expandedLabel === label && (
                <div className="video-thumbnails">
                  {videos.length === 0 ? (
                    <div className="empty-videos">No videos available for this sign</div>
                  ) : (
                    videos.map((video, idx) => {
                      const videoUrl = `http://localhost:5000/${video}`;
                      return (
                        <div key={idx} className="video-container">
                          <video
                            src={videoUrl}
                            onLoadedData={(e) => generateThumbnail(e.target)}
                            preload="metadata"
                            onClick={() => handleVideoClick(videoUrl)}
                            style={{ display: 'none' }} // Hide this video element
                          />
                          <div 
                            className="video-thumbnail" 
                            onClick={() => handleVideoClick(videoUrl)}
                            style={{
                              backgroundImage: `url(${thumbnails[videoUrl] || '/video-thumbnail-placeholder.jpg'})`,
                            }}
                          >
                            <div className="play-icon">▶</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {fullscreenVideo && (
        <div className="fullscreen-overlay" onClick={closeFullscreen}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closeFullscreen}>×</button>
            <video src={fullscreenVideo} controls autoPlay className="fullscreen-video" />
            
            <div className="prediction-section">
              <button 
                className={`btn btn-primary ${predicting ? 'loading' : ''}`} 
                onClick={handlePredictSign}
                disabled={predicting}
              >
                {predicting ? (
                  <>
                    <span className="spinner-small"></span>
                    Predicting...
                  </>
                ) : 'Predict Sign'}
              </button>
              
              {prediction && (
                <div className="prediction-result-box">
                  <h3>Prediction:</h3>
                  <p className="predicted-label">{prediction}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetViewer;