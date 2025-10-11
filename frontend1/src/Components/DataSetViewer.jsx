import React, { useEffect, useState } from 'react';
import './DatasetViewer.css';

const DatasetViewer = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLabel, setExpandedLabel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalSigns: 0, totalVideos: 0 });
  const [filteredCount, setFilteredCount] = useState(0);
  const [sortOrder, setSortOrder] = useState('alphabetical');

  // Fetch dataset from Flask
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/get-dataset-videos')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setData(data);

        const totalSigns = Object.keys(data).length;
        const totalVideos = Object.values(data).reduce(
          (total, videos) => total + videos.length,
          0
        );
        setStats({ totalSigns, totalVideos });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load dataset. Please try again.');
        setLoading(false);
      });
  }, []);

  // Update filtered count
  useEffect(() => {
    const filtered = Object.entries(data).filter(([label]) =>
      label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCount(filtered.length);
  }, [searchTerm, data]);

  // Expand/collapse labels
  const toggleExpand = (label) => {
    setExpandedLabel(expandedLabel === label ? null : label);
  };

  // Sorting
  const handleSortChange = (e) => setSortOrder(e.target.value);

  const getSortedData = () => {
    const entries = Object.entries(data);
    if (sortOrder === 'alphabetical')
      return entries.sort((a, b) => a[0].localeCompare(b[0]));
    if (sortOrder === 'video-count-asc') return entries.sort((a, b) => a[1].length - b[1].length);
    if (sortOrder === 'video-count-desc') return entries.sort((a, b) => b[1].length - a[1].length);
    return entries;
  };

  const filteredData = getSortedData().filter(([label]) =>
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return (
      <div className="dataset-container">
        <h1>Sign Language Dataset Viewer</h1>
        <p>Loading dataset...</p>
      </div>
    );

  if (error)
    return (
      <div className="dataset-container">
        <h1>Sign Language Dataset Viewer</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );

  return (
    <div className="dataset-container">
      <h1>Sign Language Dataset Viewer</h1>

      {/* Stats */}
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

      {/* Controls */}
      <div className="dataset-controls">
        <input
          type="text"
          placeholder="Search signs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={sortOrder} onChange={handleSortChange}>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>

      {/* Dataset */}
      {filteredData.length === 0 ? (
        <p>No signs found matching "{searchTerm}"</p>
      ) : (
        <div className="label-cards-container">
          {filteredData.map(([label, videos]) => (
            <div key={label} className="label-card">
              <div className="label-header" onClick={() => toggleExpand(label)}>
                <h2>{label}</h2>
                <span>{videos.length} videos {expandedLabel === label ? '▼' : '►'}</span>
              </div>

              {expandedLabel === label && (
                <div className="video-thumbnails">
                  {videos.map((video, idx) => (
                    <div key={idx} className="video-card">
                      {video.includes('youtu') ? (
                        <iframe
                          width="310"
                          height="200"
                          src={`https://www.youtube.com/embed/${video.split('youtu.be/')[1]}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : video.includes('drive.google.com') ? (
                        <iframe
                          width="310"
                          height="200"
                          src={video.replace('/view?usp=sharing', '/preview')}
                          frameBorder="0"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <video
                          width="310"
                          height="200"
                          controls
                          src={`http://localhost:5000/${video}`}
                        />
                      )}
                    </div>
                  ))}

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DatasetViewer;
