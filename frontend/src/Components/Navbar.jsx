// Components/Navbar.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🤟</span>
          <span className="logo-text">SignLang Recognizer</span>
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          <div className={`menu-icon-bar ${isMenuOpen ? 'open' : ''}`}></div>
          <div className={`menu-icon-bar ${isMenuOpen ? 'open' : ''}`}></div>
          <div className={`menu-icon-bar ${isMenuOpen ? 'open' : ''}`}></div>
        </div>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/live-prediction" 
              className={`nav-link ${location.pathname === '/live-prediction' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Live Recognition
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/dataset" 
              className={`nav-link ${location.pathname === '/dataset' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dataset Viewer
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/about" 
              className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;