// Components/AboutPage.js
import React from 'react';
import './AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-container">
      <section className="about-hero">
        <h1>About SignLang Recognizer</h1>
        <p className="lead">Breaking communication barriers through AI-powered sign language recognition</p>
      </section>
      
      <section className="about-content card">
        <h2>Our Mission</h2>
        <p>
          SignLang Recognizer is dedicated to bridging the communication gap between 
          the deaf and hearing communities through innovative technology. We aim to make 
          Indian Sign Language more accessible and understood by everyone, empowering 
          users to communicate effectively regardless of their hearing abilities.
        </p>
      </section>
      
      <section className="about-cards">
        <div className="card about-card">
          <div className="about-card-icon">🧠</div>
          <h3>AI-Powered Recognition</h3>
          <p>
            Our system uses advanced machine learning models to accurately recognize and interpret 
            Indian Sign Language gestures from video inputs, providing real-time translations.
          </p>
        </div>
        
        <div className="card about-card">
          <div className="about-card-icon">📚</div>
          <h3>Comprehensive Dataset</h3>
          <p>
            We've developed a rich dataset of Indian Sign Language signs, allowing our model 
            to recognize a wide variety of gestures and continuously improve through learning.
          </p>
        </div>
        
        <div className="card about-card">
          <div className="about-card-icon">💬</div>
          <h3>Contextual Sentences</h3>
          <p>
            Beyond individual signs, our system can generate natural, contextually appropriate 
            sentences from sequences of signs, enhancing the communication experience.
          </p>
        </div>
      </section>
      
      <section className="how-it-works card">
        <h2>How It Works</h2>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-number">1</div>
            <h3>Upload Videos</h3>
            <p>Upload videos of sign language gestures either individually or in sequence.</p>
          </div>
          
          <div className="process-step">
            <div className="step-number">2</div>
            <h3>AI Processing</h3>
            <p>Our machine learning model analyzes the videos to identify the signs being performed.</p>
          </div>
          
          <div className="process-step">
            <div className="step-number">3</div>
            <h3>Get Results</h3>
            <p>Receive accurate predictions of signs and contextually appropriate sentences.</p>
          </div>
        </div>
      </section>
      
      <section className="tech-stack card">
        <h2>Technology Stack</h2>
        <div className="tech-items">
          <div className="tech-item">
            <h4>Frontend</h4>
            <p>React, CSS3, HTML5</p>
          </div>
          
          <div className="tech-item">
            <h4>Backend</h4>
            <p>Python, Flask API</p>
          </div>
          
          <div className="tech-item">
            <h4>Machine Learning</h4>
            <p>Deep Learning, Computer Vision, NLP</p>
          </div>
        </div>
      </section>
      
      <section className="get-started card">
        <h2>Get Started Today</h2>
        <p>
          Experience the power of sign language recognition technology. 
          Upload videos, explore our dataset, and see the results in real-time.
        </p>
        <div className="cta-buttons">
          <a href="/" className="btn btn-primary">Try it out</a>
          <a href="/dataset" className="btn btn-secondary">View Dataset</a>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;