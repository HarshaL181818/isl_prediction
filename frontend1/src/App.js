// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Components/Home';
import DatasetViewer from './Components/DataSetViewer';
import LivePredictor from './Components/LivePredictor';
import Navbar from './Components/Navbar';
import Footer from './Components/Footer';
import AboutPage from './Components/AboutPage';
import './App.css';
import DataCollector from './Components/DataCollector';
import VideoStream from './Components/VideoStream';
import DatasetBrowser from './Components/DatasetBrowser';
import AddLabel from './Components/AddLabel';
import TrainingProgress from './Components/TrainingProgress';
import RealtimePredictor from './Components/RealtimePredictor';
import Sentence from './Components/Sentence';
function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/live" element={<LivePredictor />} />
            <Route path='/live-prediction' element={<RealtimePredictor />} />
            <Route path="/dataset" element={<DatasetViewer />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/collect" element={<DataCollector />} />
            <Route path="/stream" element={<VideoStream />} />
            <Route path="/view" element={<DatasetBrowser />} />
            <Route path='/add' element={<AddLabel/>}/>
            <Route path='/training' element={<TrainingProgress/>}/>
            <Route path='/sentence' element={<Sentence/>}/>
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;