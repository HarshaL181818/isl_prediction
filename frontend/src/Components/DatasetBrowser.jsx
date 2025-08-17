import React, { useEffect, useState } from "react";
import DataVisualizer from "./DataVisualizer"; // your visualization component

const DatasetBrowser = () => {
  const [words, setWords] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [sampleData, setSampleData] = useState(null);

  const [loading, setLoading] = useState({ words: false, samples: false, data: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(prev => ({ ...prev, words: true }));
    setError(null);
    fetch("http://localhost:5000/list_words")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => setWords(data))
      .catch(() => setError("Failed to fetch words. Is the server running?"))
      .finally(() => setLoading(prev => ({ ...prev, words: false })));
  }, []);

  // Fetch samples when a word is selected
  const handleWordClick = (word) => {
    if (word === selectedWord) return; // Don't refetch if already selected

    setSelectedWord(word);
    setSamples([]);
    setSelectedSample(null);
    setSampleData(null);
    setError(null);

    setLoading(prev => ({ ...prev, samples: true }));
    fetch(`http://localhost:5000/list_samples/${word}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setSamples(data))
      .catch(() => setError(`Failed to fetch samples for "${word}"`))
      .finally(() => setLoading(prev => ({ ...prev, samples: false })));
  };

  // Fetch sample data when a file is selected
  const handleSampleClick = (file) => {
    if (!selectedWord || file === selectedSample) return;

    setSelectedSample(file);
    setSampleData(null);
    setError(null);

    setLoading(prev => ({ ...prev, data: true }));
    fetch(`http://localhost:5000/get_sample/${selectedWord}/${file}`)
    
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setSampleData(data))
      .catch(() => setError(`Failed to fetch data for "${file}"`))
      .finally(() => setLoading(prev => ({ ...prev, data: false })));
  };

  return (
    <div style={{ display: "flex", fontFamily: "sans-serif", gap: "30px", padding: "20px" }}>
      {/* Column 1: Word List */}
      <div style={{ width: '200px' }}>
        <h2>Words</h2>
        {loading.words && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {words.map((word) => (
            <li
              key={word.label}
              onClick={() => handleWordClick(word.label)}
              style={{
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: word === selectedWord ? '#007bff' : 'transparent',
                color: word === selectedWord ? 'white' : 'black',
              }}
            >
          <div>{word.label}</div>
            <small style={{ fontSize: "0.8em", color: "#666" }}>
              <a href={word.link} target="_blank" rel="noopener noreferrer">
                {word.link}
              </a>
            </small>
            </li>
            
          ))}
        </ul>
      </div>

      {/* Column 2: Samples List */}
      <div style={{ width: '250px' }}>
        {selectedWord && (
          <>
            <h2>Samples for "{selectedWord}"</h2>
            {loading.samples && <p>Loading...</p>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {samples.map((file) => (
                <li
                  key={file}
                  onClick={() => handleSampleClick(file)}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    backgroundColor: file === selectedSample ? '#28a745' : 'transparent',
                    color: file === selectedSample ? 'white' : 'black',
                  }}
                >
                  {file}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      
      {/* Column 3: Visualizer */}
      <div style={{ flex: 1 }}>
        {selectedSample && <h2>Visualization: {selectedSample}</h2>}
        {loading.data ? (
          <p>Loading data...</p>
        ) : (
          sampleData && <DataVisualizer data={sampleData} />
        )}
      </div>
    </div>
  );
};

export default DatasetBrowser;