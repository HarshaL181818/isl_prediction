// DataVisualizer.jsx
import React, { useState, useEffect } from "react";
import './DatasetViewer.css';

const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],
  [0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],
  [11,13],[13,15],[15,17],[15,19],[15,21],
  [17,19],[12,14],[14,16],[16,18],[16,20],[16,22],
  [18,20]
];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

const DataVisualizer = ({ data }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % data.length);
    }, 50); // 100ms per frame (~10 FPS)

    return () => clearInterval(interval);
  }, [data]);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <p>No data to visualize.</p>;
  }

  const frame = data[frameIndex];
  const { left, right, pose } = frame;

  if (!pose && !left && !right) {
    return <p>No landmarks in this frame.</p>;
  }

  // Match DataCollector canvas size
  const width = 640;
  const height = 480;

  const scale = (val, size) => val * size;

  return (
    <div className="healthcare-landmark-visualizer">
  <h3 className="healthcare-frame-title">
    Frame Analysis: {frameIndex + 1} / {data.length}
  </h3>

  <div className="landmark-svg-container">
    <svg width={width} height={height} className="landmark-svg">
      {/* Pose Landmarks */}
      {pose && POSE_CONNECTIONS.map(([a, b], i) => {
        const p1 = pose[a];
        const p2 = pose[b];
        if (!p1 || !p2) return null;
        return (
          <line
            key={`pose-line-${i}`}
            x1={scale(p1.x, width)}
            y1={scale(p1.y, height)}
            x2={scale(p2.x, width)}
            y2={scale(p2.y, height)}
            className="landmark-line pose-line"
          />
        );
      })}
      {pose && pose.map((p, i) => (
        <circle
          key={`pose-point-${i}`}
          cx={scale(p.x, width)}
          cy={scale(p.y, height)}
          r={4}
          className="landmark-point pose-point"
        />
      ))}

      {/* Left Hand Landmarks */}
      {left && HAND_CONNECTIONS.map(([a, b], i) => {
        const p1 = left[a];
        const p2 = left[b];
        if (!p1 || !p2) return null;
        return (
          <line
            key={`left-hand-line-${i}`}
            x1={scale(p1.x, width)}
            y1={scale(p1.y, height)}
            x2={scale(p2.x, width)}
            y2={scale(p2.y, height)}
            className="landmark-line left-hand-line"
          />
        );
      })}
      {left && left.map((p, i) => (
        <circle
          key={`left-hand-point-${i}`}
          cx={scale(p.x, width)}
          cy={scale(p.y, height)}
          r={4}
          className="landmark-point left-hand-point"
        />
      ))}

      {/* Right Hand Landmarks */}
      {right && HAND_CONNECTIONS.map(([a, b], i) => {
        const p1 = right[a];
        const p2 = right[b];
        if (!p1 || !p2) return null;
        return (
          <line
            key={`right-hand-line-${i}`}
            x1={scale(p1.x, width)}
            y1={scale(p1.y, height)}
            x2={scale(p2.x, width)}
            y2={scale(p2.y, height)}
            className="landmark-line right-hand-line"
          />
        );
      })}
      {right && right.map((p, i) => (
        <circle
          key={`right-hand-point-${i}`}
          cx={scale(p.x, width)}
          cy={scale(p.y, height)}
          r={4}
          className="landmark-point right-hand-point"
        />
      ))}
    </svg>
  </div>

  {/* Raw frame data */}
  <div className="raw-data-container">
    <h4 className="raw-data-title">Biometric Frame Data (Frame {frameIndex + 1})</h4>
    <pre className="raw-data-viewer">
      {JSON.stringify(frame, null, 2)}
    </pre>
  </div>
</div>
  );
};

export default DataVisualizer;
