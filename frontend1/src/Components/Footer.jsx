// Components/Footer.js
import React from 'react';
import { Github, Twitter, Linkedin } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const Github = (props) => <svg {...props} fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>;
  const Twitter = (props) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733a4.67 4.67 0 0 0 2.048-2.578 9.3 9.3 0 0 1-2.958 1.13a4.66 4.66 0 0 0-7.938 4.25 13.229 13.229 0 0 1-9.602-4.868c-.337.578-.53 1.255-.53 1.968a4.658 4.658 0 0 0 2.065 3.877 4.644 4.644 0 0 1-2.11-.583v.06a4.658 4.658 0 0 0 3.737 4.568 4.692 4.692 0 0 1-2.104.08 4.658 4.658 0 0 0 4.342 3.234 9.348 9.348 0 0 1-5.786 1.995c-.376 0-.747-.022-1.112-.065a13.175 13.175 0 0 0 7.14 2.093c8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602a9.47 9.47 0 0 0 2.323-2.41z"/></svg>;
  const Linkedin = (props) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>;

const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden py-12">
  {/* Animated background shapes */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
  </div>

  <div className="container mx-auto px-6 relative z-10">
    {/* Main footer content grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {/* Section 1: About (spans two columns on larger screens) */}
      <div className="lg:col-span-2">
        <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-green-200 via-emerald-200 to-blue-200 bg-clip-text text-transparent">
          MediSign Link
        </h3>
        <p className="text-blue-200/70 text-base max-w-md">
          Breaking communication barriers in healthcare. Our medical sign language interpretation system empowers
          deaf and hard-of-hearing patients to communicate effectively with healthcare providers through AI.
        </p>
      </div>

      {/* Section 2: Quick Links */}
      <div>
        <h3 className="text-lg font-semibold text-blue-100 mb-4">Quick Links</h3>
        <ul className="space-y-2">
          <li><a href="/" className="text-blue-200/70 hover:text-blue-100 transition-colors duration-300">Home</a></li>
          <li><a href="/dataset" className="text-blue-200/70 hover:text-blue-100 transition-colors duration-300">Medical Sign Glossary</a></li>
          <li><a href="/about" className="text-blue-200/70 hover:text-blue-100 transition-colors duration-300">About</a></li>
        </ul>
      </div>

      {/* Section 3: Connect / Socials */}
      <div>
        <h3 className="text-lg font-semibold text-blue-100 mb-4">Connect</h3>
        <div className="flex items-center gap-4">
          <a href="#" aria-label="GitHub" className="text-blue-200/70 hover:text-white transition-colors duration-300">
            <Github className="w-6 h-6" />
          </a>
          <a href="#" aria-label="Twitter" className="text-blue-200/70 hover:text-white transition-colors duration-300">
            <Twitter className="w-6 h-6" />
          </a>
          <a href="#" aria-label="LinkedIn" className="text-blue-200/70 hover:text-white transition-colors duration-300">
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>

    {/* Bottom bar with copyright */}
    <div className="mt-12 pt-8 border-t border-white/10 text-center text-blue-300/50 text-sm">
      <p>&copy; {currentYear} MediSign Link. All rights reserved.</p>
    </div>
  </div>
</footer>

  );
};

export default Footer;