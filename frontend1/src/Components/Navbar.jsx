import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Menu, X, Home, Video, BookOpen, Database, Info } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/live-prediction', label: 'Live Interpretation', icon: Video },
    { path: '/dataset', label: 'Medical Sign Glossary', icon: BookOpen },
    { path: '/collect', label: 'Data Collection', icon: Database },
    { path: '/about', label: 'About', icon: Info },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent hidden sm:block">
              MediSign Link
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50' 
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`
            lg:hidden overflow-hidden transition-all duration-300 ease-in-out
            ${isMenuOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}
          `}
        >
          <ul className="space-y-2 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-5 py-3 rounded-xl font-medium transition-all duration-300
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50' 
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;