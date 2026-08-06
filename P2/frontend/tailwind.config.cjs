/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#051424',
        surface: '#0d1c2d',
        'surface-elevated': '#122131',
        'surface-hover': '#1c2b3c',
        border: 'rgba(255,255,255,0.08)',
        'border-strong': 'rgba(255,255,255,0.18)',
        primary: '#73e2ff',
        'primary-light': '#d6f5ff',
        'primary-dark': '#04222b',
        text: '#d4e4fa',
        'text-muted': '#8ea3b8',
        outline: '#879397',
        success: '#6ee7b7',
        'success-strong': '#059669',
        error: '#ffb4ab',
        'error-strong': '#93000a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 24px rgba(115, 226, 255, 0.18)',
        'glow-success': '0 0 32px rgba(110, 231, 183, 0.12)',
      },
    },
  },
  plugins: [],
};
