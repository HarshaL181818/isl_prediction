import React, { useRef, useEffect, useState } from "react";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS, POSE_CONNECTIONS } from "@mediapipe/holistic";

const DataVisualizer = ({ data }) => {
  const canvasRef = useRef(null);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");

    const interval = setInterval(() => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      const frame = data[frameIndex];

      if (frame.left) {
        drawConnectors(ctx, frame.left, HAND_CONNECTIONS, { color: "red" });
        drawLandmarks(ctx, frame.left, { color: "red" });
      }
      if (frame.right) {
        drawConnectors(ctx, frame.right, HAND_CONNECTIONS, { color: "blue" });
        drawLandmarks(ctx, frame.right, { color: "blue" });
      }
      if (frame.pose) {
        drawConnectors(ctx, frame.pose, POSE_CONNECTIONS, { color: "green" });
        drawLandmarks(ctx, frame.pose, { color: "green" });
      }

      setFrameIndex((prev) => (prev + 1) % data.length);
    }, 100); // ~10fps

    return () => clearInterval(interval);
  }, [data, frameIndex]);

  return <canvas ref={canvasRef} width={640} height={480} />;
};

export default DataVisualizer;
