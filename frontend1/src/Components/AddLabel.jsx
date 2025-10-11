import React, { useState } from "react";

export default function AddLabel() {
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!label || !link) {
      setMessage("⚠ Please enter both label and link");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/add_label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, link }),
      });

      const data = await response.json();
      if (data.status === "success") {
        setMessage(`✅ Added: ${data.label}`);
        setLabel("");
        setLink("");
      } else {
        setMessage("❌ Error: " + (data.error || "Something went wrong"));
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to connect to backend");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4">Add New Label</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Enter label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Enter reference link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Label
        </button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </div>
  );
}
