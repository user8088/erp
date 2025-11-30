/**
 * Centralized Color Theme Configuration
 * 
 * TO CHANGE THE THEME:
 * 1. Update the color name below (e.g., change "orange" to "blue", "purple", etc.)
 * 2. The app will automatically use the new theme throughout
 * 
 * Supported Tailwind colors: orange, blue, purple, green, red, yellow, pink, indigo, etc.
 */

// Change this to your desired theme color
export const THEME_COLOR = 'orange';

// Theme configuration object
export const theme = {
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  // Keep grays for neutral elements
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#171717',
  },
};

// Tailwind-compatible color classes - automatically uses THEME_COLOR
export const themeClasses = {
  primary: {
    bg: `bg-${THEME_COLOR}-500`,
    bgLight: `bg-${THEME_COLOR}-50`,
    text: `text-${THEME_COLOR}-600`,
    border: `border-${THEME_COLOR}-600`,
    hover: `hover:bg-${THEME_COLOR}-100`,
  },
  active: {
    bg: `bg-${THEME_COLOR}-50`,
    text: `text-${THEME_COLOR}-600`,
    border: `border-${THEME_COLOR}-600`,
  },
};

// Helper function to get theme classes (for dynamic usage)
export const getThemeClass = (type: 'bg' | 'text' | 'border' | 'bgLight' | 'hover') => {
  const colorMap: Record<string, string> = {
    bg: `bg-${THEME_COLOR}-500`,
    bgLight: `bg-${THEME_COLOR}-50`,
    text: `text-${THEME_COLOR}-600`,
    border: `border-${THEME_COLOR}-600`,
    hover: `hover:bg-${THEME_COLOR}-100`,
  };
  return colorMap[type] || '';
};

