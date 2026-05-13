/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Studio (painéis escuros) ──────────────────────────────────────────
        studio: {
          bg:        '#07070f',
          surface:   '#0d0d1a',
          elevated:  '#131325',
          border:    '#1e1e3a',
          muted:     '#2a2a4a',
          glass:     'rgba(13,13,26,0.85)',
        },
        // ─── Paper (área de escrita) ───────────────────────────────────────────
        paper: {
          bg:          '#f9f8f5',
          surface:     '#ffffff',
          border:      '#e4e0d4',
          text:        '#1a1829',
          muted:       '#5a576e',
          placeholder: '#afa9c3',
        },
        // ─── Accent ───────────────────────────────────────────────────────────
        accent: {
          primary:   '#7c3aed',
          glow:      '#9d5cf0',
          bright:    '#a855f7',
          secondary: '#0891b2',
          cyan:      '#22d3ee',
          gold:      '#f59e0b',
          amber:     '#fbbf24',
          red:       '#ef4444',
          green:     '#10b981',
          pink:      '#ec4899',
        },
        // ─── Text layers ──────────────────────────────────────────────────────
        text: {
          primary:   '#eeeeff',
          secondary: '#9898c0',
          muted:     '#555575',
          accent:    '#c084fc',
        },
        // ─── Rima chains ──────────────────────────────────────────────────────
        rhyme: {
          a: '#a855f7',
          b: '#22d3ee',
          c: '#fbbf24',
          d: '#34d399',
          e: '#f87171',
          f: '#f472b6',
          g: '#a3e635',
          h: '#fb923c',
        },
      },

      fontFamily: {
        mono:  ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
        display: ['Inter', 'sans-serif'],
      },

      boxShadow: {
        // Glows
        'glow-sm':  '0 0 12px rgba(124,58,237,0.25)',
        'glow':     '0 0 24px rgba(124,58,237,0.35)',
        'glow-lg':  '0 0 48px rgba(124,58,237,0.4)',
        'glow-cyan':'0 0 20px rgba(8,145,178,0.3)',
        'glow-gold':'0 0 20px rgba(245,158,11,0.3)',
        // Panels
        'panel-left':  '4px 0 32px rgba(0,0,0,0.6)',
        'panel-right': '-4px 0 32px rgba(0,0,0,0.6)',
        'paper':       '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        // Cards
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.4)',
        // Inner
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },

      backgroundImage: {
        // Gradients para o acento de cor
        'gradient-accent': 'linear-gradient(90deg, #7c3aed, #0891b2, #f59e0b)',
        'gradient-purple': 'linear-gradient(135deg, #7c3aed, #a855f7)',
        'gradient-cyan':   'linear-gradient(135deg, #0891b2, #22d3ee)',
        'gradient-studio': 'linear-gradient(180deg, #0d0d1a 0%, #07070f 100%)',
        'gradient-glass':  'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-paper':  'linear-gradient(180deg, #ffffff 0%, #f9f8f5 100%)',
      },

      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      transitionDuration: {
        '400': '400ms',
      },

      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'bounce-dot': 'bounceDot 1.2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(124,58,237,0.3)' },
          '50%':      { boxShadow: '0 0 28px rgba(124,58,237,0.6)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%':           { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
