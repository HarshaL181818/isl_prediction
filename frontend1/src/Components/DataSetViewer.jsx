import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Video, ChevronDown, ChevronRight, PlayCircle, TrendingUp, Database, Filter } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden -mx-[calc((100vw-100%)/2)]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 mt-20" >
        {/* Page Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full text-sm mb-6">
            <BookOpen className="w-4 h-4 text-blue-300" />
            <span>Comprehensive Reference Library</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Medical Sign Glossary
          </h1>
          <p className="text-blue-200/60 text-lg max-w-2xl mx-auto">
            Explore our comprehensive collection of medical sign language references
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="group p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  {stats.totalSigns}
                </div>
                <div className="text-sm text-blue-300">Total Medical Signs</div>
              </div>
            </div>
          </div>

          <div className="group p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {stats.totalVideos}
                </div>
                <div className="text-sm text-purple-300">Total Reference Videos</div>
              </div>
            </div>
          </div>

          <div className="group p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-green-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                  {filteredCount}
                </div>
                <div className="text-sm text-green-300">Filtered Medical Signs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
              <input
                type="text"
                placeholder="Search medical signs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400/50 focus:bg-white/10 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
              <select
                value={sortOrder}
                onChange={handleSortChange}
                className="pl-12 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-400/50 focus:bg-white/10 transition-all appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="alphabetical" className="bg-gray-900">Alphabetical</option>
                <option value="mostVideos" className="bg-gray-900">Most Videos</option>
                <option value="leastVideos" className="bg-gray-900">Least Videos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dataset Display */}
        {filteredData.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-blue-300/50" />
            </div>
            <p className="text-xl text-blue-200/60 mb-2">No medical signs found</p>
            <p className="text-blue-300/40">Try searching for "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map(([label, videos]) => (
              <div
                key={label}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl hover:border-blue-400/30 transition-all duration-300"
              >
                {/* Label Header */}
                <div
                  onClick={() => toggleExpand(label)}
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{label}</h2>
                      <p className="text-sm text-blue-300">
                        {videos.length} reference {videos.length === 1 ? 'video' : 'videos'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      {videos.length}
                    </span>
                    {expandedLabel === label ? (
                      <ChevronDown className="w-6 h-6 text-blue-300 group-hover:scale-110 transition-transform" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-blue-300 group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                </div>

                {/* Video Thumbnails */}
                {expandedLabel === label && (
                  <div className="px-6 pb-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videos.map((video, idx) => (
                        <div
                          key={idx}
                          className="relative group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all hover:scale-105 shadow-lg"
                        >
                          <div className="aspect-video bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                            {video.includes('youtu') ? (
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${video.split('youtu.be/')[1]}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={`Medical Sign: ${label} video ${idx + 1}`}
                              ></iframe>
                            ) : video.includes('drive.google.com') ? (
                              <iframe
                                className="w-full h-full"
                                src={video.replace('/view?usp=sharing', '/preview')}
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                title={`Medical Sign: ${label} video ${idx + 1}`}
                              ></iframe>
                            ) : (
                              <video
                                className="w-full h-full object-cover"
                                controls
                                src={`http://localhost:5000/${video}`}
                                aria-label={`Medical Sign: ${label} video ${idx + 1}`}
                              />
                            )}
                          </div>
                          <div className="p-3 bg-gradient-to-r from-blue-900/40 to-purple-900/40">
                            <p className="text-sm text-blue-200 font-medium">Reference {idx + 1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

        select option {
          background: #1e293b;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default DatasetViewer;
