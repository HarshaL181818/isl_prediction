import React, { useEffect, useState } from "react";
import DataVisualizer from "./DataVisualizer"; // your visualization component
import { FileText, Video, Eye, Link2, Loader, AlertCircle, ChevronRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden -mx-[calc((100vw-100%)/2)]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Page Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-full text-sm mb-6">
            <Eye className="w-4 h-4 text-indigo-300" />
            <span>Training Data Explorer</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Stored Data Viewer
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto">
            Browse and visualize collected medical sign language data
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl text-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Three Column Layout */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Column 1: Word List */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Medical Signs</h2>
              </div>

              {loading.words ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : (
                <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {words.map((word) => (
                    <li
                      key={word.label}
                      onClick={() => handleWordClick(word.label)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                        word.label === selectedWord
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 shadow-lg shadow-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-400/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{word.label}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${
                          word.label === selectedWord ? 'rotate-90' : ''
                        }`} />
                      </div>
                      {word.link && (
                        <a
                          href={word.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          <span className="truncate">Reference</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Column 2: Samples List */}
          <div className="lg:col-span-3">
            {selectedWord ? (
              <div className="sticky top-24 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate">Samples</h2>
                    <p className="text-xs text-green-300 truncate">"{selectedWord}"</p>
                  </div>
                </div>

                {loading.samples ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-green-400" />
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {samples.map((file) => (
                      <li
                        key={file}
                        onClick={() => handleSampleClick(file)}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border ${
                          file === selectedSample
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400 shadow-lg shadow-green-500/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-green-400/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Video className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{file}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="sticky top-24 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
                <div className="text-center py-12 text-blue-300/50">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a medical sign</p>
                  <p className="text-sm mt-2">to view samples</p>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Visualizer */}
          <div className="lg:col-span-6">
            <div className="p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl min-h-[700px]">
              {selectedSample ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold">Visualization</h2>
                      <p className="text-xs text-purple-300 truncate">{selectedSample}</p>
                    </div>
                  </div>

                  {loading.data ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader className="w-12 h-12 animate-spin text-purple-400 mb-4" />
                      <p className="text-purple-300">Loading data...</p>
                    </div>
                  ) : (
                    sampleData && <DataVisualizer data={sampleData} />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-blue-300/50">
                    <Eye className="w-20 h-20 mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">No sample selected</p>
                    <p className="text-sm">Select a medical sign and sample to visualize data</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .delay-1000 {
          animation-delay: 1000ms;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>
    </div>
  );
};

export default DatasetBrowser;