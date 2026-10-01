import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    // La ruta exacta de @heroui/theme depende de cómo npm haya anidado el
    // paquete (a veces queda dentro de node_modules/@heroui/react); se
    // incluyen ambas para no depender de la resolución de una instalación
    // en particular.
    './node_modules/@heroui/theme/dist/**/*.{js,mjs}',
    './node_modules/@heroui/react/node_modules/@heroui/theme/dist/**/*.{js,mjs}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif']
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.15rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
        md: ['0.9375rem', { lineHeight: '1.45rem' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.6rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.85rem' }],
        '3xl': ['1.8rem', { lineHeight: '2.1rem' }]
      },
      colors: {
        // Marca (acento) — se conserva el verde de Forestal Tezains pero
        // como escala completa y más contenida: solo para acción primaria,
        // selección activa e indicadores de estado, no decoración.
        brand: {
          50: '#eef7e8',
          100: '#dcefd1',
          200: '#b9dfa6',
          300: '#8fca75',
          400: '#67b350',
          500: '#3f8f27',
          600: '#2f6b1f',
          700: '#245418',
          800: '#1c4213',
          900: '#15330f'
        },
        // Superficie del sidebar: capa neutra, más oscura y fría que el
        // contenido, con la misma familia verde-carbón (no gris puro).
        ink: {
          950: '#0e1a11',
          900: '#132118',
          800: '#1a2c1f',
          700: '#25392a',
          600: '#3a4f3d',
          500: '#5a6e5c',
          400: '#7f9080',
          300: '#a9b7a8',
          200: '#ced9cc',
          100: '#e6ede4'
        },
        // Superficie de contenido y tarjetas
        surface: {
          DEFAULT: '#f6f8f4',
          card: '#ffffff',
          border: '#e4e9e0',
          muted: '#eef2ea'
        },
        // Estados semánticos
        success: { DEFAULT: '#1f7a3d', bg: '#dff3e3' },
        warning: { DEFAULT: '#a8710b', bg: '#fdf1da' },
        danger: { DEFAULT: '#c0392b', bg: '#fbe4e1' },
        info: { DEFAULT: '#0e2841', bg: '#e4ecf3' },
        // Alias retro-compatibles (algunos componentes viejos los usan)
        verde: {
          DEFAULT: '#3f8f27',
          fuerte: '#2f6b1f',
          suave: '#eaf6df',
          borde: '#cfe8ba'
        },
        navy: '#0e2841',
        fondo: '#f6f8f4'
      },
      boxShadow: {
        panel: '0 1px 2px rgba(20, 35, 15, 0.04), 0 8px 24px -12px rgba(20, 35, 15, 0.12)',
        card: '0 1px 2px rgba(20, 35, 15, 0.05)',
        popover: '0 12px 32px -8px rgba(14, 26, 17, 0.28)'
      },
      borderRadius: {
        panel: '14px',
        card: '12px'
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'toast-in': 'toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-in': 'modal-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'overlay-in': 'overlay-in 150ms ease-out',
        'fade-in': 'fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
  },
  plugins: [
    // Se mapean los tokens de marca ya existentes (brand/success/warning/
    // danger) a los slots semánticos de HeroUI en vez de aceptar su paleta
    // por defecto — así los componentes migrados a HeroUI se ven con la
    // identidad de Forestal Tezains, no con los colores de fábrica.
    heroui({
      themes: {
        light: {
          colors: {
            background: '#f6f8f4',
            foreground: '#132118',
            primary: {
              50: '#eef7e8',
              100: '#dcefd1',
              200: '#b9dfa6',
              300: '#8fca75',
              400: '#67b350',
              500: '#3f8f27',
              600: '#2f6b1f',
              700: '#245418',
              800: '#1c4213',
              900: '#15330f',
              DEFAULT: '#2f6b1f',
              foreground: '#ffffff'
            },
            success: { DEFAULT: '#1f7a3d', foreground: '#ffffff' },
            warning: { DEFAULT: '#a8710b', foreground: '#ffffff' },
            danger: { DEFAULT: '#c0392b', foreground: '#ffffff' }
          }
        },
        // Solo lo usa el Editor de Formatos (/formatos/:id/editor), que
        // pone la clase "dark" mientras está abierto: grises neutros y el
        // azul de selección de Figma, para que el diseño (no la interfaz)
        // sea lo que resalte.
        dark: {
          colors: {
            background: '#1e1e1e',
            foreground: '#e6e6e6',
            content1: '#2c2c2c',
            content2: '#333333',
            content3: '#3a3a3a',
            content4: '#444444',
            divider: 'rgba(255, 255, 255, 0.08)',
            default: {
              50: '#262626',
              100: '#333333',
              200: '#3d3d3d',
              300: '#4a4a4a',
              400: '#7a7a7a',
              500: '#9a9a9a',
              600: '#b5b5b5',
              700: '#cfcfcf',
              800: '#e0e0e0',
              900: '#f0f0f0',
              DEFAULT: '#3d3d3d',
              foreground: '#e6e6e6'
            },
            primary: {
              50: '#e6f4ff',
              100: '#b3dfff',
              200: '#80caff',
              300: '#4db5ff',
              400: '#26a6ff',
              500: '#0d99ff',
              600: '#0b85e0',
              700: '#0970bd',
              800: '#075a99',
              900: '#054473',
              DEFAULT: '#0d99ff',
              foreground: '#ffffff'
            },
            success: { DEFAULT: '#14ae5c', foreground: '#ffffff' },
            warning: { DEFAULT: '#ffa629', foreground: '#1e1e1e' },
            danger: { DEFAULT: '#f24822', foreground: '#ffffff' }
          }
        }
      }
    })
  ]
};
