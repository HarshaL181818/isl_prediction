import React, { useState } from 'react';

// A small component to inject the necessary global styles and fonts.
// In a larger React application, this would typically be handled in a global CSS file or index.html.
const GlobalStyles = () => (
    <>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
            body {
                font-family: 'Inter', sans-serif;
                background-color: #0f172a; /* bg-slate-900 */
                color: white;
                overflow-x: hidden;
            }
            .animate-spin-fast {
                animation: spin 0.6s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .fade-in {
                animation: fadeIn 0.5s ease-in-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
    </>
);


const Sentence = () => {
    const [keywords, setKeywords] = useState('');
    const [resultText, setResultText] = useState('');
    const [errorText, setErrorText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // --- Gemini API Configuration ---
    const apiKey = ""; // Leave empty, Canvas will provide it at runtime.
    const model = "gemini-2.0-flash-lite";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // The specialized system prompt to guide the AI
    const systemPrompt = `
        You are MedSentenc-AI, a highly efficient medical language model.
        Your sole purpose is to convert a list of keywords provided by a user into a single, clear, and concise sentence.
        This sentence should be phrased as if a patient is describing their symptoms to a doctor.
        RULES:
        - ALWAYS respond with only the generated sentence. Do not add any conversational text, introductions, or explanations like "Here is the sentence:".
        - The sentence must be grammatically correct and medically coherent.
        - If the keywords are nonsensical or clearly not medical, generate a polite request to provide medical keywords.
        - Keep the tone direct and descriptive.
        - Example Input: "stomach ache, sharp pain, after eating"
        - Example Output: "Doctor, I'm experiencing a sharp pain in my stomach, which seems to happen right after I eat."
        - Example Input: "knee pain, dull, worse when walking up stairs"
        - Example Output: "I have a dull pain in my knee that gets worse when I'm walking up stairs."
    `;

    const generateSentence = async (userKeywords) => {
        setIsLoading(true);
        setResultText('');
        setErrorText('');

        const payload = {
            contents: [{
                parts: [{ text: userKeywords }]
            }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 100,
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText} (Status: ${response.status})`);
            }

            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                setResultText(candidate.content.parts[0].text);
            } else {
                throw new Error("Invalid response structure from the API.");
            }
        } catch (err) {
            console.error("API call failed:", err);
            setErrorText("Failed to generate sentence. Please check the console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            const trimmedKeywords = keywords.trim();
            if (trimmedKeywords) {
                generateSentence(trimmedKeywords);
            }
        }
    };

    return (
        <>
            <GlobalStyles />
            <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
                {/* Background Glows */}
                <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

                <div className="relative z-10 w-full max-w-2xl text-center">
                    <header className="mb-8">
                        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-2">
                            MedSentenc-AI
                        </h1>
                        <p className="text-lg text-blue-200/70">
                            Your AI assistant for converting patient keywords into clear clinical sentences.
                        </p>
                    </header>

                    <main className="w-full">
                        {/* Input Card */}
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 mb-6">
                            <label htmlFor="keywords" className="block text-sm font-medium text-blue-200 mb-2 text-left">
                                Enter Patient Keywords (e.g., "headache, sharp, behind eyes, 3 days")
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="keywords"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type keywords and press Enter..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Output Area */}
                        <div className="w-full min-h-[150px] bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 flex items-center justify-center text-left">
                            {isLoading && (
                                <svg className="w-8 h-8 text-cyan-400 animate-spin-fast" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {!isLoading && !resultText && !errorText && (
                                <div className="text-blue-200/60">
                                    Generated sentence will appear here...
                                </div>
                            )}
                            {resultText && (
                                <p className="text-lg text-cyan-200 fade-in">{resultText}</p>
                            )}
                            {errorText && (
                                <p className="text-lg text-red-400 fade-in">{errorText}</p>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};

export default Sentence;
