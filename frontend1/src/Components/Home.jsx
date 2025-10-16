// Components/Home.js
import React, { useState, useRef } from "react";
import { Upload, Video, Sparkles, Heart, Activity, FileText, X, Check, Play } from 'lucide-react';
                                                                                                                                                                                                                                                                            
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
  const footerRef = useRef(null);

  const scrollToFooter = () => {
    footerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      const uploadPromises = [];

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("video", files[i]);

        const uploadPromise = axios.post("http://localhost:5000/predict-sign", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        uploadPromises.push(uploadPromise);
      }

      const responses = await Promise.all(uploadPromises);

      let predictions = "";
      responses.forEach(response => {
        const cleanedPrediction = cleanPrediction(response.data.label);
        predictions += cleanedPrediction + " ";
      });


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
     <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden -mx-[calc((100vw-100%)/2)]">{/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 mt-20">

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full text-sm">
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span>AI-Powered Medical Interpretation</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                MediSign Link
              </h1>
              
              <p className="text-xl lg:text-2xl text-blue-100/80 leading-relaxed">
                Bridging Patient-Doctor Communication
              </p>
              
              <p className="text-lg text-blue-200/60 max-w-2xl">
                Empowering clear dialogue in healthcare with AI-powered sign language interpretation. 
                Seamlessly convert sign language gestures into real-time medical insights.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button
          className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
          onClick={scrollToFooter}   // scroll on click
        >
          <Play className="w-5 h-5" />
          Start Consultation
        </button>

        <button
          className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105"
          onClick={() => window.location.href = '/dataset'}   // redirect
        >
          Explore Medical Signs
        </button>
              </div>
            </div>
            
            <div className="flex-1 flex justify-center animate-float">
              <div className="relative">
                <div className="w-80 h-80 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-2xl absolute inset-0"></div>
                <div className="relative w-80 h-80 bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center shadow-2xl">
                  <Activity className="w-32 h-32 text-blue-300" strokeWidth={1.5} />
                </div>
                <div className="absolute top-10 right-10 w-20 h-20 bg-blue-500/30 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center animate-pulse">
                  <Heart className="w-10 h-10 text-red-300" />
                </div>
                <div className="absolute bottom-10 left-10 w-20 h-20 bg-purple-500/30 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center animate-pulse delay-500">
                  <Video className="w-10 h-10 text-purple-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
            Facilitate Healthcare Dialogue
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Video, title: 'Capture Patient Signs', desc: 'Upload sign language videos from patient interactions for accurate recognition.' },
              { icon: Sparkles, title: 'Interpret Medical Gestures', desc: 'Our AI model accurately predicts medical signs and phrases.' },
              { icon: FileText, title: 'Generate Medical Narratives', desc: 'Convert multiple signs into clear, meaningful sentences for medical records.' }
            ].map((feature, i) => (
              <div key={i} className="group p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-100">{feature.title}</h3>
                <p className="text-blue-200/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="container mx-auto px-6 mb-8">
            <div className="p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl text-red-200">
              {error}
            </div>
          </div>
        )}
        <div ref={footerRef}></div> 
        {/* Upload Section */}
        <section className="container mx-auto px-6 pb-20">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Single Video Upload */}
            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-blue-400/30 transition-all duration-300 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                Single Sign Interpretation
              </h3>
              
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    id="single-file-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="single-file-input"
                    className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-blue-400/30 rounded-2xl hover:border-blue-400/60 hover:bg-blue-500/5 transition-all cursor-pointer group"
                  >
                    <Upload className="w-6 h-6 text-blue-300 group-hover:scale-110 transition-transform" />
                    <span className="text-blue-200">{file ? file.name : 'Choose Patient Video'}</span>
                  </label>
                  {file && (
                    <button
                      onClick={handleResetSingle}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={loading || !file}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Interpreting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Interpret Sign
                    </>
                  )}
                </button>

                {result && (
                  <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-400/30 rounded-2xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <h4 className="font-semibold text-green-200">Interpreted Sign:</h4>
                    </div>
                    <p className="text-lg text-white">{result}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Multiple Videos Upload */}
            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-purple-400/30 transition-all duration-300 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                Medical Sentence Generation
              </h3>
              
              <div className="space-y-6">
                <div>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFilesChange}
                    ref={multipleFileInputRef}
                    id="multiple-file-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="multiple-file-input"
                    className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-purple-400/30 rounded-2xl hover:border-purple-400/60 hover:bg-purple-500/5 transition-all cursor-pointer group"
                  >
                    <Upload className="w-6 h-6 text-purple-300 group-hover:scale-110 transition-transform" />
                    <span className="text-purple-200">
                      {files.length > 0 ? `${files.length} videos selected` : 'Choose Patient Videos'}
                    </span>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-blue-200">Selected Videos:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 group hover:border-purple-400/30 transition-colors">
                          <span className="text-sm text-blue-100 truncate flex-1">{f.name}</span>
                          <button
                            onClick={() => removeFile(i)}
                            className="w-6 h-6 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition-colors ml-2"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleMultipleUploads}
                    disabled={multiLoading || files.length === 0}
                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {multiLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Narrative
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleClearSelection}
                    disabled={multiLoading || files.length === 0}
                    className="px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>

                {multiResult && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-sm border border-blue-400/30 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="w-5 h-5 text-blue-400" />
                        <h4 className="font-semibold text-blue-200">Interpreted Signs:</h4>
                      </div>
                      <p className="text-white">{multiResult}</p>
                    </div>

                    {generatedSentence && (
                      <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-400/30 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-green-400" />
                          <h4 className="font-semibold text-green-200">Generated Medical Sentence:</h4>
                        </div>
                        <p className="text-lg text-white leading-relaxed">{generatedSentence}</p>
                      </div>
                    )}

                    {elapsedTime && (
                      <div className="text-sm text-blue-300 text-center">
                        ⏱️ Time taken: {elapsedTime} seconds
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .delay-500 {
          animation-delay: 500ms;
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
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
}

export default Home;