import { useState, useEffect } from 'react';

// Breakpoint definitions
const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [orientation, setOrientation] = useState('landscape');

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      setWindowSize({
        width: newWidth,
        height: newHeight,
      });

      // Determine orientation
      setOrientation(newHeight > newWidth ? 'portrait' : 'landscape');
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial values

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Device type detection
  const isMobile = windowSize.width < breakpoints.sm;
  const isTablet = windowSize.width >= breakpoints.sm && windowSize.width < breakpoints.lg;
  const isDesktop = windowSize.width >= breakpoints.lg;
  const isLargeScreen = windowSize.width >= breakpoints.xl;

  // Screen size helpers
  const isXs = windowSize.width < breakpoints.sm;
  const isSm = windowSize.width >= breakpoints.sm && windowSize.width < breakpoints.md;
  const isMd = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isLg = windowSize.width >= breakpoints.lg && windowSize.width < breakpoints.xl;
  const isXl = windowSize.width >= breakpoints.xl && windowSize.width < breakpoints['2xl'];
  const is2Xl = windowSize.width >= breakpoints['2xl'];

  // Touch device detection
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Dynamic sizing helpers
  const getResponsiveValue = (mobile, tablet, desktop) => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };

  const getModalSize = () => {
    if (isMobile) return 'full'; // Full screen on mobile
    if (isTablet) return 'large'; // Large modal on tablet
    return 'default'; // Default size on desktop
  };

  const getButtonSize = () => {
    if (isMobile) return 'lg'; // Larger buttons for touch
    return 'md'; // Default button size
  };

  const getSpacing = () => {
    if (isMobile) return 'tight'; // Tighter spacing on mobile
    if (isTablet) return 'normal';
    return 'comfortable'; // More spacing on desktop
  };

  const getColumns = (maxCols = 3) => {
    if (isMobile) return 1;
    if (isTablet) return Math.min(2, maxCols);
    return maxCols;
  };

  const getFontScale = () => {
    if (isMobile) return 0.875; // Slightly smaller text on mobile
    if (isTablet) return 0.95;
    return 1; // Base font size on desktop
  };

  return {
    // Size information
    windowSize,
    orientation,
    
    // Device types
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isTouchDevice,
    
    // Breakpoint helpers
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    
    // Dynamic helpers
    getResponsiveValue,
    getModalSize,
    getButtonSize,
    getSpacing,
    getColumns,
    getFontScale,
    
    // Breakpoint values for custom logic
    breakpoints,
  };
};

export default useResponsive; 