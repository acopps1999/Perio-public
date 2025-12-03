module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // QRRENT Design System (Pure Black with Periwinkle)
        qrrent: {
          // Dark Theme (Default for QRRENT)
          dark: {
            bg: {
              primary: '#000000',      // Pure black
              secondary: '#1a1a1a',    // Very dark gray - cards
              tertiary: '#2a2a2a',     // Darker elevated surfaces
              elevated: '#1f1f1f',     // Elevated cards
              hover: '#2f3240',        // Hover states with blue tint
            },
            text: {
              primary: '#ffffff',      // White - headings, primary
              secondary: '#9ca3af',    // Light gray - subtext
              tertiary: '#6b7280',     // Medium gray - placeholders
              disabled: '#4b5563',     // Dark gray - disabled
            },
            border: {
              subtle: '#2a2a2a',       // Barely visible
              elevated: '#3f3f46',     // More visible borders
            },
          },
          // Light Theme (for light mode support)
          light: {
            bg: {
              primary: '#ffffff',      // White
              secondary: '#fafafa',    // Light gray
              tertiary: '#f4f4f5',     // Elevated surfaces
              elevated: '#f9fafb',     // Elevated cards
              hover: '#e5e7eb',        // Hover states
            },
            text: {
              primary: '#000000',      // Black - headings
              secondary: '#6b7280',    // Medium gray - subtext
              tertiary: '#9ca3af',     // Light gray - placeholders
              disabled: '#d1d5db',     // Disabled text
            },
            border: {
              subtle: '#e5e7eb',       // Subtle borders
              elevated: '#d1d5db',     // More visible borders
            },
          },
          // Primary Accent (Periwinkle)
          primary: {
            DEFAULT: '#9b9cfa',        // Periwinkle - Primary CTA
            hover: '#b4b5ff',          // Lighter purple - Hover
            active: '#8b8ce6',         // Slightly darker - Active
          },
          // Status Colors
          success: {
            DEFAULT: '#10b981',        // Emerald green
            bg: {
              dark: '#065f46',         // Dark green background
              light: '#d1fae5',        // Light green background
            },
          },
          pending: {
            DEFAULT: '#f59e0b',        // Warm amber
            bg: {
              dark: '#78350f',         // Dark amber background
              light: '#fef3c7',        // Light amber background
            },
          },
          error: {
            DEFAULT: '#dc2626',        // Red
            bg: {
              dark: '#7f1d1d',         // Dark red background
              light: '#fee2e2',        // Light red background
            },
          },
          // Chart/Data Colors
          chart: {
            purple: '#8b5cf6',
            'light-purple': '#c4b5fd',
            gold: '#fbbf24',
            cyan: '#06b6d4',
            white: '#e5e7eb',
          },
        },
        // Indigo & Neutral Design System (PRISM - keep for backward compatibility)
        prism: {
          // Dark Theme (Indigo-based)
          dark: {
            bg: {
              primary: '#18181b',      // Neutral 900 - Rich dark
              secondary: '#27272a',    // Neutral 800 - Dark cards
              tertiary: '#3f3f46',     // Neutral 700 - Elevated surfaces
              hover: '#52525b',        // Neutral 600 - Hover states
            },
            text: {
              primary: '#fafafa',      // Neutral 50 - Headings, primary
              secondary: '#d4d4d8',    // Neutral 300 - Subtext, descriptions
              tertiary: '#a1a1aa',     // Neutral 400 - Placeholders, subtle
              disabled: '#71717a',     // Neutral 500 - Disabled text
            },
            border: {
              subtle: '#3f3f46',       // Neutral 700 - Barely visible
              elevated: '#52525b',     // Neutral 600 - More visible
            },
          },
          // Light Theme (Neutral-based)
          light: {
            bg: {
              primary: '#ffffff',      // White
              secondary: '#fafafa',    // Neutral 50 - Light gray cards
              tertiary: '#f4f4f5',     // Neutral 100 - Elevated surfaces
              hover: '#e4e4e7',        // Neutral 200 - Hover states
            },
            text: {
              primary: '#18181b',      // Neutral 900 - Headings, primary
              secondary: '#52525b',    // Neutral 600 - Subtext, descriptions
              tertiary: '#71717a',     // Neutral 500 - Placeholders, subtle
              disabled: '#a1a1aa',     // Neutral 400 - Disabled text
            },
            border: {
              subtle: '#e4e4e7',       // Neutral 200 - Subtle borders
              elevated: '#d4d4d8',     // Neutral 300 - More visible
            },
          },
          // Primary Accent (Indigo)
          primary: {
            DEFAULT: '#6366f1',        // Indigo 500 - Primary CTA dark mode
            hover: '#818cf8',          // Indigo 400 - Hover state
            light: '#4f46e5',          // Indigo 600 - Primary CTA light mode (darker for contrast)
            'light-hover': '#4338ca',  // Indigo 700 - Light mode hover
          },
          // Status Colors
          success: {
            DEFAULT: '#10b981',        // Bright green
            bg: {
              dark: '#065f46',         // Dark green background
              light: '#d1fae5',        // Light green background
            },
          },
          warning: {
            DEFAULT: '#f59e0b',        // Bright amber
            bg: {
              dark: '#78350f',         // Dark amber background
              light: '#fef3c7',        // Light amber background
            },
          },
          error: {
            DEFAULT: '#dc2626',        // Red
            bg: {
              dark: '#7f1d1d',         // Dark red background
              light: '#fee2e2',        // Light red background
            },
          },
          // Chart/Data Colors
          chart: {
            purple: '#8b5cf6',
            'light-purple': '#c4b5fd',
            gold: '#fbbf24',
            cyan: '#06b6d4',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.3' }],      // 12px - Micro text
        'sm': ['0.875rem', { lineHeight: '1.4' }],     // 14px - Small text
        'base': ['1rem', { lineHeight: '1.5' }],       // 16px - Body text
        'lg': ['1.125rem', { lineHeight: '1.4' }],     // 18px - Subsection headers
        'xl': ['1.5rem', { lineHeight: '1.3' }],       // 24px - Section headers
        '2xl': ['2rem', { lineHeight: '1.2' }],        // 32px - Page titles
      },
      spacing: {
        '4.5': '1.125rem',  // 18px
        '18': '4.5rem',     // 72px
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 4px 6px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.3)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.4)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.5)',
        // Light mode shadows
        'light-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'light': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'light-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'light-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'light-xl': '0 20px 25px rgba(0, 0, 0, 0.15)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}