// Components/Footer.js
import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">SignLang Recognizer</h3>
          <p className="footer-description">
            Breaking barriers through technology. Our sign language recognition system helps connect
            the deaf and hearing community through AI-powered communication.
          </p>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-links">
            <li><a href="/">Home</a></li>
            <li><a href="/dataset">Dataset Viewer</a></li>
            <li><a href="/about">About</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3 className="footer-title">Connect</h3>
          <div className="social-links">
            <a href="#" className="social-link">
              <span>GitHub</span>
            </a>
            <a href="#" className="social-link">
              <span>Twitter</span>
            </a>
            <a href="#" className="social-link">
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {currentYear} SignLang Recognizer. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;