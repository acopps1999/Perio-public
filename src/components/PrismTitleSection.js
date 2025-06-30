import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const PrismTitleSection = ({ className = "" }) => {
  const { isDarkMode } = useTheme();
  // CSS keyframes and styles as a style object
  const prismHeroStyles = {
    position: 'relative',
    width: '100%',
    height: '80px',
    background: '#0d1421',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: '2rem',
    paddingRight: '2rem',
    zIndex: 10,
  };

  const titleContentStyles = {
    position: 'relative',
    zIndex: 15,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    color: 'white',
  };

  const mainTitleStyles = {
    fontSize: '2rem',
    fontWeight: 300,
    fontFamily: '"Inter", "Helvetica Neue", "Arial", "Segoe UI", sans-serif',
    letterSpacing: '0.1em',
    margin: 0,
    color: '#ffffff',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
  };

  const subtitleStyles = {
    fontSize: '0.85rem',
    fontWeight: 300,
    letterSpacing: '0.02em',
    opacity: 0.9,
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
    lineHeight: 1.2,
  };

  const dividerStyles = {
    display: 'inline-block',
    margin: '0 0.5rem',
    opacity: 0.7,
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');
          @keyframes prismaticRotation1 {
            0% { 
              transform: rotate(0deg) scale(1);
              filter: hue-rotate(0deg) brightness(1);
            }
            25% {
              transform: rotate(90deg) scale(1.1);
              filter: hue-rotate(90deg) brightness(1.3);
            }
            50% {
              transform: rotate(180deg) scale(1.05);
              filter: hue-rotate(180deg) brightness(1.1);
            }
            75% {
              transform: rotate(270deg) scale(1.15);
              filter: hue-rotate(270deg) brightness(1.4);
            }
            100% { 
              transform: rotate(360deg) scale(1);
              filter: hue-rotate(360deg) brightness(1);
            }
          }

          @keyframes prismaticRotation2 {
            0% { 
              transform: rotate(0deg) scale(1.1) skew(5deg);
              filter: hue-rotate(180deg) brightness(0.8);
            }
            20% {
              transform: rotate(72deg) scale(0.9) skew(-2deg);
              filter: hue-rotate(144deg) brightness(1.2);
            }
            40% {
              transform: rotate(144deg) scale(1.2) skew(3deg);
              filter: hue-rotate(108deg) brightness(0.9);
            }
            60% {
              transform: rotate(216deg) scale(0.95) skew(-4deg);
              filter: hue-rotate(72deg) brightness(1.5);
            }
            80% {
              transform: rotate(288deg) scale(1.1) skew(1deg);
              filter: hue-rotate(36deg) brightness(1.1);
            }
            100% { 
              transform: rotate(360deg) scale(1.1) skew(5deg);
              filter: hue-rotate(0deg) brightness(0.8);
            }
          }



          .prism-hero-bg::before {
            content: '';
            position: absolute;
            top: -100%;
            left: -100%;
            width: 300%;
            height: 300%;
            background: 
              conic-gradient(from 0deg at 30% 40%, 
                transparent 0deg, 
                rgba(255, 255, 255, 0.4) 15deg, 
                transparent 30deg,
                rgba(200, 220, 255, 0.3) 45deg,
                transparent 60deg,
                rgba(255, 255, 255, 0.6) 75deg,
                transparent 90deg
              ),
              conic-gradient(from 120deg at 70% 60%, 
                transparent 0deg, 
                rgba(180, 200, 255, 0.5) 20deg, 
                transparent 40deg,
                rgba(255, 255, 255, 0.3) 60deg,
                transparent 80deg,
                rgba(220, 230, 255, 0.4) 100deg,
                transparent 120deg
              ),
              conic-gradient(from 240deg at 20% 80%, 
                transparent 0deg, 
                rgba(255, 255, 255, 0.7) 25deg, 
                transparent 50deg,
                rgba(160, 180, 255, 0.4) 75deg,
                transparent 100deg
              ),
              radial-gradient(ellipse at 60% 20%, 
                rgba(255, 255, 255, 0.8) 0%, 
                rgba(255, 255, 255, 0.3) 20%, 
                transparent 40%
              ),
              radial-gradient(ellipse at 15% 70%, 
                rgba(200, 220, 255, 0.6) 0%, 
                rgba(200, 220, 255, 0.2) 25%, 
                transparent 50%
              );
            animation: prismaticRotation1 12s linear infinite;
            z-index: 1;
          }

          .prism-hero-bg::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: 
              conic-gradient(from 60deg at 80% 30%, 
                transparent 0deg, 
                rgba(255, 255, 255, 0.5) 10deg, 
                transparent 20deg,
                rgba(180, 200, 255, 0.4) 30deg,
                transparent 40deg,
                rgba(255, 255, 255, 0.3) 50deg,
                transparent 60deg
              ),
              conic-gradient(from 180deg at 25% 50%, 
                transparent 0deg, 
                rgba(220, 230, 255, 0.6) 30deg, 
                transparent 60deg,
                rgba(255, 255, 255, 0.4) 90deg,
                transparent 120deg
              ),
              linear-gradient(45deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.2) 25%, 
                transparent 50%, 
                rgba(200, 220, 255, 0.3) 75%, 
                transparent 100%
              ),
              linear-gradient(-30deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.4) 20%, 
                transparent 40%, 
                rgba(180, 200, 255, 0.2) 60%, 
                transparent 80%
              ),
              radial-gradient(ellipse at 45% 85%, 
                rgba(255, 255, 255, 0.5) 0%, 
                rgba(255, 255, 255, 0.1) 30%, 
                transparent 60%
              );
            animation: prismaticRotation2 16s linear infinite reverse;
            z-index: 2;
          }

          @media (max-width: 768px) {
            .prism-hero-responsive {
              height: 70px !important;
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            .prism-title-responsive {
              font-size: 1.5rem !important;
            }
            .prism-subtitle-responsive {
              font-size: 0.75rem !important;
            }
          }

          @media (max-width: 480px) {
            .prism-hero-responsive {
              height: 60px !important;
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            .prism-title-responsive {
              font-size: 1.2rem !important;
            }
            .prism-subtitle-responsive {
              font-size: 0.7rem !important;
            }
          }

          .prism-app-background {
            position: relative;
            background: ${isDarkMode ? '#0d1421' : '#ffffff'};
            overflow: hidden;
          }

          .prism-app-background::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${isDarkMode ? `
              conic-gradient(from 0deg at 30% 40%, 
                transparent 0deg, 
                rgba(255, 255, 255, 0.15) 15deg, 
                transparent 30deg,
                rgba(200, 220, 255, 0.12) 45deg,
                transparent 60deg,
                rgba(255, 255, 255, 0.25) 75deg,
                transparent 90deg
              ),
              conic-gradient(from 120deg at 70% 60%, 
                transparent 0deg, 
                rgba(180, 200, 255, 0.2) 20deg, 
                transparent 40deg,
                rgba(255, 255, 255, 0.12) 60deg,
                transparent 80deg,
                rgba(220, 230, 255, 0.16) 100deg,
                transparent 120deg
              ),
              conic-gradient(from 240deg at 20% 80%, 
                transparent 0deg, 
                rgba(255, 255, 255, 0.28) 25deg, 
                transparent 50deg,
                rgba(160, 180, 255, 0.16) 75deg,
                transparent 100deg
              ),
              radial-gradient(ellipse at 60% 20%, 
                rgba(255, 255, 255, 0.3) 0%, 
                rgba(255, 255, 255, 0.12) 20%, 
                transparent 40%
              ),
              radial-gradient(ellipse at 15% 70%, 
                rgba(200, 220, 255, 0.24) 0%, 
                rgba(200, 220, 255, 0.08) 25%, 
                transparent 50%
              )` : `
              conic-gradient(from 0deg at 30% 40%, 
                transparent 0deg, 
                rgba(100, 120, 200, 0.08) 15deg, 
                transparent 30deg,
                rgba(150, 170, 220, 0.06) 45deg,
                transparent 60deg,
                rgba(100, 120, 200, 0.12) 75deg,
                transparent 90deg
              ),
              conic-gradient(from 120deg at 70% 60%, 
                transparent 0deg, 
                rgba(120, 140, 220, 0.1) 20deg, 
                transparent 40deg,
                rgba(100, 120, 200, 0.06) 60deg,
                transparent 80deg,
                rgba(140, 160, 230, 0.08) 100deg,
                transparent 120deg
              ),
              conic-gradient(from 240deg at 20% 80%, 
                transparent 0deg, 
                rgba(100, 120, 200, 0.14) 25deg, 
                transparent 50deg,
                rgba(110, 130, 210, 0.08) 75deg,
                transparent 100deg
              ),
              radial-gradient(ellipse at 60% 20%, 
                rgba(100, 120, 200, 0.15) 0%, 
                rgba(100, 120, 200, 0.06) 20%, 
                transparent 40%
              ),
              radial-gradient(ellipse at 15% 70%, 
                rgba(140, 160, 230, 0.12) 0%, 
                rgba(140, 160, 230, 0.04) 25%, 
                transparent 50%
              )`};
            animation: prismaticRotation1 12s linear infinite;
            z-index: -2;
            pointer-events: none;
          }

          .prism-app-background::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${isDarkMode ? `
              conic-gradient(from 60deg at 80% 30%, 
                transparent 0deg, 
                rgba(255, 255, 255, 0.2) 10deg, 
                transparent 20deg,
                rgba(180, 200, 255, 0.16) 30deg,
                transparent 40deg,
                rgba(255, 255, 255, 0.12) 50deg,
                transparent 60deg
              ),
              conic-gradient(from 180deg at 25% 50%, 
                transparent 0deg, 
                rgba(220, 230, 255, 0.24) 30deg, 
                transparent 60deg,
                rgba(255, 255, 255, 0.16) 90deg,
                transparent 120deg
              ),
              linear-gradient(45deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.08) 25%, 
                transparent 50%, 
                rgba(200, 220, 255, 0.12) 75%, 
                transparent 100%
              ),
              linear-gradient(-30deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.16) 20%, 
                transparent 40%, 
                rgba(180, 200, 255, 0.08) 60%, 
                transparent 80%
              ),
              radial-gradient(ellipse at 45% 85%, 
                rgba(255, 255, 255, 0.2) 0%, 
                rgba(255, 255, 255, 0.04) 30%, 
                transparent 60%
              )` : `
              conic-gradient(from 60deg at 80% 30%, 
                transparent 0deg, 
                rgba(100, 120, 200, 0.1) 10deg, 
                transparent 20deg,
                rgba(120, 140, 220, 0.08) 30deg,
                transparent 40deg,
                rgba(100, 120, 200, 0.06) 50deg,
                transparent 60deg
              ),
              conic-gradient(from 180deg at 25% 50%, 
                transparent 0deg, 
                rgba(140, 160, 230, 0.12) 30deg, 
                transparent 60deg,
                rgba(100, 120, 200, 0.08) 90deg,
                transparent 120deg
              ),
              linear-gradient(45deg, 
                transparent 0%, 
                rgba(100, 120, 200, 0.04) 25%, 
                transparent 50%, 
                rgba(130, 150, 210, 0.06) 75%, 
                transparent 100%
              ),
              linear-gradient(-30deg, 
                transparent 0%, 
                rgba(100, 120, 200, 0.08) 20%, 
                transparent 40%, 
                rgba(120, 140, 220, 0.04) 60%, 
                transparent 80%
              ),
              radial-gradient(ellipse at 45% 85%, 
                rgba(100, 120, 200, 0.1) 0%, 
                rgba(100, 120, 200, 0.02) 30%, 
                transparent 60%
              )`};
            animation: prismaticRotation2 16s linear infinite reverse;
            z-index: -1;
            pointer-events: none;
          }
        `}
      </style>
      
      <div 
        className={`prism-hero-bg prism-hero-responsive ${className}`}
        style={prismHeroStyles}
      >
        <div style={titleContentStyles}>
          <h1 
            className="prism-title-responsive"
            style={mainTitleStyles}
          >
            PRISM
          </h1>
          <p 
            className="prism-subtitle-responsive"
            style={subtitleStyles}
          >
            by PerioProtect<sup>®</sup>
            <span style={dividerStyles}>|</span>
            PerioSciences<sup>®</sup>
          </p>
        </div>
      </div>
    </>
  );
};

export default PrismTitleSection; 