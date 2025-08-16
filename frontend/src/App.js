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

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/live-prediction" element={<LivePredictor />} />
            <Route path="/dataset" element={<DatasetViewer />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/collect" element={<DataCollector />} />
            <Route path="/stream" element={<VideoStream />} />
            <Route path="/view" element={<DatasetBrowser />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;