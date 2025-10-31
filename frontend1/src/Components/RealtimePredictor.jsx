import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { Video, StopCircle, PlayCircle, Activity, Clock, AlertCircle, CheckCircle, Lightbulb, Zap, Hand, Bot } from 'lucide-react';

// Hand + Pose connections (No changes here)
const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
];
const POSE_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,7],
    [0,4],[4,5],[5,6],[6,8],
    [9,10],[11,12],
    [11,13],[13,15],[15,17],[15,19],[15,21],
    [17,19],[12,14],[14,16],[16,18],[16,20],[16,22],
    [18,20]
];

// --- Drawing helpers (No changes here) ---
function drawConnectors(ctx, landmarks, connections, opts = {}) {
    const lineWidth = opts.lineWidth ?? 2;
    const color = opts.color ?? "#00FF00";
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    for (const [i, j] of connections) {
        if (landmarks[i] && landmarks[j]) {
            ctx.beginPath();
            ctx.moveTo(landmarks[i].x * ctx.canvas.width, landmarks[i].y * ctx.canvas.height);
            ctx.lineTo(landmarks[j].x * ctx.canvas.width, landmarks[j].y * ctx.canvas.height);
            ctx.stroke();
        }
    }
    ctx.restore();
}
function drawLandmarks(ctx, landmarks, opts = {}) {
    const radius = opts.radius ?? 4;
    const color = opts.color ?? "#FF0000";
    ctx.save();
    ctx.fillStyle = color;
    for (const lm of landmarks) {
        if (!lm) continue;
        ctx.beginPath();
        ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.restore();
}

const RealtimePredictor = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const sequenceRef = useRef([]);
    const predictingRef = useRef(false);
    const frameCountRef = useRef(0);
    const cameraRef = useRef(null); // Use a ref for the camera instance

    // States for MediaPipe Prediction
    const [prediction, setPrediction] = useState(null);
    const [confidence, setConfidence] = useState(null);
    const [allPredictions, setAllPredictions] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [frameCount, setFrameCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // States for Sentence Generation
    const [generatedSentence, setGeneratedSentence] = useState('');
    const [isGeneratingSentence, setIsGeneratingSentence] = useState(false);
    const [sentenceError, setSentenceError] = useState('');

    // --- NEW: State to track if MediaPipe scripts are loaded ---
    const [scriptsLoaded, setScriptsLoaded] = useState(false);


    const SEQ_LEN = 50;
    const PREDICT_EVERY_N_FRAMES = 3;

    // --- NEW: useEffect to load MediaPipe scripts from CDN ---
    useEffect(() => {
        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.crossOrigin = 'anonymous';
                script.onload = () => resolve(script);
                script.onerror = () => reject(new Error(`Script load error for ${src}`));
                document.head.appendChild(script);
            });
        };

        // Load all scripts in parallel and set state when done
        Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
            loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'),
            loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
        ]).then(() => {
            setScriptsLoaded(true);
        }).catch(err => {
            console.error("Failed to load MediaPipe scripts", err);
            setError("Core recognition libraries failed to load. Please refresh.");
        });

    }, []); // Empty dependency array ensures this runs only once on mount.


    // Convert landmarks
    const toArray = (lms) => !lms ? [] : lms.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }));

    const collectFrame = (results) => {
        let left = [], right = [];
        if (results.multiHandedness && results.multiHandLandmarks) {
            for (let i = 0; i < results.multiHandedness.length; i++) {
                const label = results.multiHandedness[i].label;
                if (label === "Left") left = toArray(results.multiHandLandmarks[i]);
                else if (label === "Right") right = toArray(results.multiHandLandmarks[i]);
            }
        }
        const pose = toArray(results.poseLandmarks);
        return { left, right, pose };
    };

    const sendForPrediction = async (seq) => {
        try {
            predictingRef.current = true;
            setLoading(true);
            let paddedSeq = seq;
            if (seq.length < SEQ_LEN) {
                const pad = Array(SEQ_LEN - seq.length).fill({ left: [], right: [], pose: [] });
                paddedSeq = [...pad, ...seq];
            }
            const res = await axios.post("http://localhost:5000/predict", { data: paddedSeq });
            const word = res.data.prediction || "";

            setPrediction(word);
            setConfidence(res.data.confidence ? (res.data.confidence * 100).toFixed(2) + "%" : null);
            const timestamp = new Date().toLocaleTimeString();
            if (word && (allPredictions.length === 0 || allPredictions[allPredictions.length - 1].prediction !== word)) {
                 setAllPredictions((prev) => [...prev, { prediction: word, timestamp, confidence: res.data.confidence }].slice(-10));
            }

        } catch (err) {
            setError("Prediction failed. Is the backend server running?");
        } finally {
            predictingRef.current = false;
            sequenceRef.current = [];
            frameCountRef.current = 0;
            setFrameCount(0);
            setLoading(false);
        }
    };
    
    const generateFinalSentence = async () => {
        if (allPredictions.length < 2) {
            setSentenceError("Need at least two predicted words to generate a sentence.");
            return;
        }
        
        setIsGeneratingSentence(true);
        setGeneratedSentence('');
        setSentenceError('');

        const keywords = allPredictions.map(p => p.prediction).join(', ');

        const apiKey = ""; // Leave empty for Canvas runtime
        const model = "gemini-2.0-flash-lite";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const systemPrompt = `
            You are MedSentenc-AI. Convert medical keywords from a patient into a single, clear sentence for a doctor.
            RULES:
            - Respond with ONLY the generated sentence. No conversational text.
            - Ensure the sentence is grammatically correct and medically coherent.
            - Example Input: "chest pain, sharp, left side, breathing difficulty"
            - Example Output: "Doctor, I'm experiencing a sharp pain on the left side of my chest, and I'm having difficulty breathing."
        `;
        
        const payload = {
            contents: [{ parts: [{ text: keywords }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.5, maxOutputTokens: 100 }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`API error: ${response.statusText}`);
            
            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate?.content?.parts?.[0]?.text) {
                setGeneratedSentence(candidate.content.parts[0].text);
            } else {
                throw new Error("Invalid response structure from API.");
            }
        } catch (err) {
            console.error("Sentence generation failed:", err);
            setSentenceError("Failed to generate the sentence. Please try again.");
        } finally {
            setIsGeneratingSentence(false);
        }
    };


    const startRecognition = () => {
        // --- MODIFIED: Check if scripts are loaded before starting ---
        if (!scriptsLoaded) {
            setError("Recognition libraries are still loading. Please wait a moment.");
            return;
        }

        setIsActive(true);
        setAllPredictions([]);
        setGeneratedSentence('');
        setError(null);
        setSentenceError('');
        sequenceRef.current = [];
        frameCountRef.current = 0;

        // --- MODIFIED: Access MediaPipe classes from the global window object ---
        const hands = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
        const pose = new window.Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
        pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

        let lastResults = {};
        hands.onResults((r) => { lastResults.hands = r; });
        pose.onResults((r) => { lastResults.pose = r; });

        cameraRef.current = new window.Camera(videoRef.current, {
            onFrame: async () => {
                if (!videoRef.current) return;
                await hands.send({ image: videoRef.current });
                await pose.send({ image: videoRef.current });
                const merged = { ...lastResults.hands, ...lastResults.pose };
                
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext("2d");
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    if (merged.poseLandmarks) {
                        drawConnectors(ctx, merged.poseLandmarks, POSE_CONNECTIONS, { color: "#00FFFF" });
                        drawLandmarks(ctx, merged.poseLandmarks, { color: "#FF00FF", radius: 3 });
                    }
                    if (merged.multiHandLandmarks) {
                        for (const hand of merged.multiHandLandmarks) {
                            drawConnectors(ctx, hand, HAND_CONNECTIONS, { color: "#00FF00" });
                            drawLandmarks(ctx, hand, { color: "#FF0000", radius: 4 });
                        }
                    }
                }
                
                if (!predictingRef.current) {
                    const frame = collectFrame(merged);
                    sequenceRef.current.push(frame);
                    if (sequenceRef.current.length > SEQ_LEN)
                        sequenceRef.current = sequenceRef.current.slice(-SEQ_LEN);

                    frameCountRef.current++;
                    setFrameCount(sequenceRef.current.length);

                    if (sequenceRef.current.length === SEQ_LEN && frameCountRef.current % PREDICT_EVERY_N_FRAMES === 0) {
                        sendForPrediction([...sequenceRef.current]);
                    }
                }
            },
            width: 640,
            height: 480,
        });
        cameraRef.current.start();
    };

    const stopRecognition = () => {
        setIsActive(false);
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
        sequenceRef.current = [];
        frameCountRef.current = 0;
        setFrameCount(0);
    };
    
    useEffect(() => {
        return () => {
            stopRecognition();
        };
    }, []);

    useEffect(() => {
        if (generatedSentence) {
            speakSentence(generatedSentence);
        }
    }, [generatedSentence]);


    const speakSentence = (text) => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden -mx-[calc((100vw-100%)/2)]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10 mt-20">
                {/* Page Title */}
                <div className="text-center mb-12 animate-fade-in">
                     <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full text-sm mb-6">
                        <Zap className="w-4 h-4 text-purple-300" />
                        <span>Live AI Sign-to-Sentence Interpretation</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-transparent mb-4">
                        Real-time Clinical Communicator
                    </h1>
                    <p className="text-blue-200/60 text-lg max-w-2xl mx-auto">
                        Perform signs to generate words, then create a complete sentence for the doctor.
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-8 mb-12">
                    {/* Video Container */}
                    <div className="lg:col-span-2">
                        <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                             <div className="relative bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                                <video ref={videoRef} className="w-full h-auto" autoPlay muted playsInline style={{ display: 'block' }} />
                                <canvas ref={canvasRef} className="absolute left-0 top-0 pointer-events-none w-full h-full" width={640} height={480} />
                                {isActive && (
                                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-xl">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm font-medium">LIVE TRACKING</span>
                                        </div>
                                    </div>
                                )}
                                {!isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-sm">
                                        <div className="text-center">
                                            <Hand className="w-20 h-20 text-purple-300/50 mx-auto mb-4" />
                                            <p className="text-blue-200/60 text-lg mb-2">Ready to Interpret</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                                {!isActive ? (
                                    <button onClick={startRecognition} disabled={!scriptsLoaded} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait">
                                        <PlayCircle className="w-5 h-5" /> {scriptsLoaded ? 'Start Recognition' : 'Loading Libraries...'}
                                    </button>
                                ) : (
                                    <button onClick={stopRecognition} className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3">
                                        <StopCircle className="w-5 h-5" /> Stop Recognition
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Prediction & Sentence Column */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Current Prediction */}
                        <div className="sticky top-24 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                             <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Word Prediction</h2>
                            </div>
                            <div className="min-h-[150px] flex items-center justify-center">
                                {loading ? (
                                    <div className="text-center"><div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-4"></div><p className="text-purple-300">Processing...</p></div>
                                ) : prediction ? (
                                    <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/30 rounded-2xl w-full">
                                        <p className="text-2xl font-bold text-white text-center">{prediction}</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-blue-300/50"><Zap className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No prediction yet</p></div>
                                )}
                            </div>
                        </div>
                        
                        {/* Sentence Generation Card */}
                        <div className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">AI Sentence Generator</h2>
                            </div>
                            <button 
                                onClick={generateFinalSentence}
                                disabled={allPredictions.length < 2 || isGeneratingSentence}
                                className="w-full py-3 mb-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {isGeneratingSentence ? 'Generating...' : 'Generate Sentence'}
                            </button>
                             <div className="min-h-[100px] flex flex-col items-center justify-center p-4 bg-black/20 rounded-lg">
                                {isGeneratingSentence ? (
                                    <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
                                ) : generatedSentence ? (
                                    <>
                                        <p className="text-green-200 text-center fade-in mb-4">{generatedSentence}</p>
                                        <button
                                            onClick={() => speakSentence(generatedSentence)}
                                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-semibold hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                        >
                                            <Video className="w-4 h-4" /> Speak Sentence
                                        </button>
                                    </>
                                ) : sentenceError ? (
                                    <p className="text-red-400 text-sm text-center fade-in">{sentenceError}</p>
                                ) : (
                                    <p className="text-blue-300/50 text-sm text-center">Final sentence will appear here.</p>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Prediction History */}
                <div className="mb-12 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold">Predicted Word History</h2>
                    </div>
                    {allPredictions.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {allPredictions.map((item, index) => (
                                <div key={index} className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 group">
                                    <p className="text-white font-medium text-lg">{item.prediction}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-blue-300/50"><Clock className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>Predicted words will appear here</p></div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.8s ease-out; }
            `}</style>
        </div>
    );
};

export default RealtimePredictor;

