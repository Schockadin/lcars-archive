// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}',
  './app/**/*.{js,ts,jsx,tsx,mdx}',   // ← je nach deiner Ordnerstruktur
  './components/**/*.{js,ts,jsx,tsx,mdx}',],
  theme: {
    extend: {
      colors: {
        lcars: {
          purple:     '#7b68ee',
          'purple-dim': '#5b4fcf',
          'purple-dark': '#2d2550',
          blue:       '#4fc3f7',
          amber:      '#ffb347',
          red:        '#e05a5a',
          green:      '#4caf82',
          bg:         '#08081a',
          surface:    '#10102a',
          'surface-2': '#1a1838',
          border:     '#2d2550',
          text:       '#c8b8ff',
          'text-dim': '#6a5f9e',
          'text-data': '#4fc3f7',
          'rose-light': '#ffcccb',
        }
      },
      fontFamily: {
        lcars: ['var(--font-antonio)', 'Antonio', 'sans-serif'],
        'lcars-mono': ['var(--font-mono-lcars)', 'Share Tech Mono', 'monospace'],
      },
      borderRadius: {
        'lcars-pill': '24px',
      }
    },
  },

  plugins: [],
};

export default config;