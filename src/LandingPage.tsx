import React from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="landing-page">
      {/* Floating Background Orbs */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>

      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo-section">
            <svg className="landing-logo-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#166534', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#15803D', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#22C55E', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="30" cy="30" r="28" fill="none" stroke="url(#logoGradient)" strokeWidth="2" opacity="0.4" className="logo-ring"/>
              <circle cx="30" cy="30" r="22" fill="none" stroke="url(#logoGradient)" strokeWidth="1.5" opacity="0.2"/>
              <path d="M 20 28 L 30 16 L 40 28 L 35 28 L 35 42 L 25 42 L 25 28 Z" fill="url(#logoGradient)" filter="url(#glow)" className="logo-arrow"/>
              <circle cx="30" cy="47" r="2.5" fill="url(#logoGradient)" opacity="0.8" className="logo-dot"/>
            </svg>
            <div className="landing-logo-text">
              <h1>WP Content Optimizer <span className="pro-badge">PRO</span></h1>
              <p className="landing-tagline">
                Enterprise-Grade SEO Automation by{' '}
                <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer">
                  AffiliateMarketingForSuccess.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-content">
        <div className="landing-hero">
          <h2 className="landing-hero-title">
            Transform Your Content Into<br/>
            <span className="gradient-text">Ranking Machines</span>
          </h2>
          <p className="landing-hero-subtitle">
            AI-powered SEO optimization that adapts to Google's algorithm in real-time.<br/>
            Generate, optimize, and publish content that dominates search results.
          </p>

          <div className="landing-cta-buttons">
            <button className="btn btn-primary-lg" onClick={onEnterApp}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
              </svg>
              Launch Optimizer
            </button>
            <a 
              href="https://seo-hub.affiliatemarketingforsuccess.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary-lg"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Explore SEO Arsenal
            </a>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>God Mode 2.0</h3>
            <p>Autonomous content optimization that never sleeps. Set it and forget it while your content climbs the rankings 24/7.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Gap Analysis</h3>
            <p>State-of-the-art content analysis using NLP, entity extraction, and competitor insights powered by NeuronWriter integration.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Bulk Publishing</h3>
            <p>Generate and publish hundreds of optimized articles with one click. Scale your content empire effortlessly.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Rank Guardian</h3>
            <p>Real-time monitoring and automatic fixes for content health. Protect your rankings 24/7 with AI-powered alerts.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="footer-brand">
            <img
              src="https://affiliatemarketingforsuccess.com/wp-content/uploads/2023/03/cropped-Affiliate-Marketing-for-Success-Logo-Edited.png"
              alt="Affiliate Marketing for Success Logo"
              className="footer-logo"
            />
            <div className="footer-info">
              <p className="footer-credit">Created by <strong>Alexios Papaioannou</strong></p>
              <p className="footer-site">
                Owner of{' '}
                <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer">
                  affiliatemarketingforsuccess.com
                </a>
              </p>
            </div>
          </div>
          <div className="footer-links">
            <h4>Learn More About:</h4>
            <ul>
              <li><a href="https://affiliatemarketingforsuccess.com/affiliate-marketing" target="_blank" rel="noopener noreferrer">Affiliate Marketing</a></li>
              <li><a href="https://affiliatemarketingforsuccess.com/ai" target="_blank" rel="noopener noreferrer">AI</a></li>
              <li><a href="https://affiliatemarketingforsuccess.com/seo" target="_blank" rel="noopener noreferrer">SEO</a></li>
              <li><a href="https://affiliatemarketingforsuccess.com/blogging" target="_blank" rel="noopener noreferrer">Blogging</a></li>
              <li><a href="https://affiliatemarketingforsuccess.com/review" target="_blank" rel="noopener noreferrer">Reviews</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Affiliate Marketing for Success. All rights reserved. | SOTA Engine v12.0</p>
        </div>
      </footer>
    </div>
  );
};
