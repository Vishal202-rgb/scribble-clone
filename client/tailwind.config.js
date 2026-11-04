/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skribbl: {
          blue: '#1b64da',
          blueDark: '#134eb3',
          blueLight: '#e8f1fd',
          blueBorder: '#bcd5f7',
          green: '#22c55e',
          greenDark: '#16a34a',
          greenLight: '#ecfdf5',
          yellow: '#f59e0b',
          yellowLight: '#fef3c7',
          orange: '#f97316',
          red: '#ef4444',
          redLight: '#fee2e2',
          purple: '#8b5cf6',
          bg: '#eef5fc',
          card: '#ffffff',
          border: '#d7e4f2',
          text: '#1e293b',
          muted: '#64748b'
        },
        mono: {
          white: '#FFFFFF',
          light: '#F8FAFC',
          border: '#E2E8F0',
          text: '#1E293B',
          secondary: '#64748B',
        }
      },
      fontFamily: {
        fun: [
          'Fredoka',
          'Space Grotesk',
          'sans-serif'
        ],
        heading: [
          'Fredoka',
          'Space Grotesk',
          'sans-serif'
        ],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ]
      },
      boxShadow: {
        'skribbl': '0 4px 0 0 rgba(0, 0, 0, 0.1)',
        'skribbl-hover': '0 6px 0 0 rgba(0, 0, 0, 0.1)',
        'skribbl-btn': '0 4px 0 0 rgba(0, 0, 0, 0.18)',
        'skribbl-btn-pressed': '0 1px 0 0 rgba(0, 0, 0, 0.18)'
      }
    },
  },
  plugins: [],
};
