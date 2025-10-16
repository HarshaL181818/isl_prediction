// Assumption: You have an icon library like 'lucide-react' installed.
// For this example, I've included placeholder SVG components.
const BrainCircuit = (props) => <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.1.39-1.99 1.03-2.69a3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.45 1.62.18 2.44.1 2.64.64.7 1.03 1.59 1.03 2.69 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85v2.74c0 .27.16.59.67.5A10 10 0 0 0 22 12a10 10 0 0 0-10-10z"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path><path d="M12 2v4"></path><path d="M12 20v2"></path><path d="M5 12H3"></path><path d="M21 12h-2"></path><path d="m16.5 15.5-.8.8"></path><path d="M8.3 7.3l.8-.8"></path><path d="m15.7 7.3-.8.8"></path><path d="m7.5 15.5.8-.8"></path></svg>;
const BookHeart = (props) => <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v14a2 2 0 0 1-2 2H6.5a2.5 2.5 0 0 1 0-5H20"></path><path d="M12.5 2.5c2.3 0 4.5 2 4.5 4.5 0 2.2-2.1 4.4-4.5 5.9-2.4-1.5-4.5-3.7-4.5-5.9 0-2.5 2.2-4.5 4.5-4.5z"></path></svg>;
const MessageSquareQuote = (props) => <svg {...props} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M15 9h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 1 1 1v.5a.5.5 0 0 0 .8.4l.4-.4"></path><path d="M9 9h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 1 1 1v.5a.5.5 0 0 0 .8.4l.4-.4"></path></svg>;


const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden -mx-[calc((100vw-100%)/2)]">
        {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 mt-20">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-green-300 via-emerald-300 to-blue-300 bg-clip-text text-transparent mb-4">
            About MediSign Link
          </h1>
          <p className="text-blue-200/70 text-lg lg:text-xl max-w-3xl mx-auto">
            Bridging the communication gap in healthcare with AI-powered medical sign language interpretation.
          </p>
        </section>

        {/* Mission Section */}
        <section className="mb-20 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold mb-4 text-center">Our Mission</h2>
          <p className="text-blue-200/80 text-lg text-center max-w-4xl mx-auto">
            **MediSign Link** is dedicated to ensuring clear and effective communication between deaf or hard-of-hearing patients and their healthcare providers. By leveraging cutting-edge AI, we aim to eliminate barriers, improve patient outcomes, and foster a more inclusive and accessible healthcare environment for everyone.
          </p>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* Card 1 */}
          <div className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                <BrainCircuit className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Medical Interpretation</h3>
            <p className="text-blue-200/70">
              Our system uses advanced deep learning models to accurately recognize and interpret medical-specific sign language gestures from video, providing real-time translations for clinicians.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                <BookHeart className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Comprehensive Medical Glossary</h3>
            <p className="text-blue-200/70">
              We have curated a rich dataset of medical signs, allowing our model to understand a wide variety of healthcare-related gestures and continuously improve its accuracy.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <MessageSquareQuote className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Contextual Clinical Narrative</h3>
            <p className="text-blue-200/70">
              Beyond individual signs, our system generates coherent, contextually appropriate sentences from gesture sequences, creating a clear narrative for medical professionals.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mb-20 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full text-2xl font-bold mb-4">1</div>
              <h3 className="text-xl font-bold mb-2">Capture Patient Signs</h3>
              <p className="text-blue-200/70">Use a live camera feed or upload a video of a patient using medical sign language.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full text-2xl font-bold mb-4">2</div>
              <h3 className="text-xl font-bold mb-2">AI Processing</h3>
              <p className="text-blue-200/70">Our secure, HIPAA-compliant model analyzes the video to identify the signs being performed.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full text-2xl font-bold mb-4">3</div>
              <h3 className="text-xl font-bold mb-2">Receive Interpretation</h3>
              <p className="text-blue-200/70">Get an accurate text translation of the signs and a contextually appropriate clinical summary.</p>
            </div>
          </div>
        </section>

        {/* Technology Stack Section */}
        <section className="mb-20 p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h4 className="text-xl font-bold text-green-300 mb-2">Frontend</h4>
              <p className="text-blue-200/70">React, Tailwind CSS, HTML5</p>
            </div>
            <div>
              <h4 className="text-xl font-bold text-green-300 mb-2">Backend</h4>
              <p className="text-blue-200/70">Python, Flask API</p>
            </div>
            <div>
              <h4 className="text-xl font-bold text-green-300 mb-2">Machine Learning</h4>
              <p className="text-blue-200/70">Deep Learning, Computer Vision, NLP</p>
            </div>
          </div>
        </section>

        {/* Get Started Section */}
        <section className="text-center p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">Start Improving Patient Communication</h2>
          <p className="text-blue-200/70 text-lg max-w-2xl mx-auto mb-6">
            Experience the power of real-time medical sign language interpretation. Try our live interpretation tool or explore our medical sign glossary.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a href="/live-prediction" className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 hover:scale-105">
              Try Live Interpretation
            </a>
            <a href="/dataset" className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105">
              View Medical Glossary
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;