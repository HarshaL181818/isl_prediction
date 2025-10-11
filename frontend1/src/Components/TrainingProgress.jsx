import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function TrainingProgress() {
  const [progress, setProgress] = useState([]);

  useEffect(() => {
  socket.on("training_progress", (data) => {
    if (data.message === "Training started") {
      setProgress([]); // reset table
    } else {
      setProgress((prev) => [...prev, data]);
    }
  });
  return () => socket.off("training_progress");
}, []);


  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Training Progress</h2>
      {progress.length === 0 ? (
        <p>No training running right now</p>
      ) : (
        <table className="table-auto border-collapse border border-gray-400">
          <thead>
            <tr>
              <th className="border px-2">Epoch</th>
              <th className="border px-2">Loss</th>
              <th className="border px-2">Accuracy</th>
              <th className="border px-2">Val Loss</th>
              <th className="border px-2">Val Accuracy</th>
              <th className="border px-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((p, i) => (
              <tr key={i}>
                <td className="border px-2">{p.epoch ?? "-"}</td>
                <td className="border px-2">
                  {p.loss !== undefined ? p.loss.toFixed(4) : "-"}
                </td>
                <td className="border px-2">
                  {p.accuracy !== undefined
                    ? (p.accuracy * 100).toFixed(2) + "%"
                    : "-"}
                </td>
                <td className="border px-2">
                  {p.val_loss !== undefined ? p.val_loss.toFixed(4) : "-"}
                </td>
                <td className="border px-2">
                  {p.val_accuracy !== undefined
                    ? (p.val_accuracy * 100).toFixed(2) + "%"
                    : "-"}
                </td>
                <td className="border px-2">{p.message ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
