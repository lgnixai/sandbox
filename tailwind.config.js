/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 暗色主题色彩
        dark: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          panel: '#2d2d30',
          border: '#3e3e42',
          text: '#cccccc',
          'text-secondary': '#969696',
          accent: '#007acc',
          hover: '#2a2d2e'
        },
        // 浅色主题色彩
        light: {
          bg: '#ffffff',
          sidebar: '#f5f5f5',
          panel: '#fafafa',
          border: '#e1e4e8',
          text: '#24292e',
          'text-secondary': '#586069',
          accent: '#0366d6',
          hover: '#f6f8fa'
        }
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        'xs': '0.125rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}