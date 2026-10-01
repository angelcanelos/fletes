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
        sans: 'var(--fuente-app)'
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
        // Los colores de marca, neutros y estados salen de variables CSS
        // (definidas en src/styles/index.css): la paleta índigo es la de
        // la app, y la clase .tema-clasico restaura la verde original en
        // el Editor de Formatos, que conserva su diseño.
        brand: {
          '50': 'rgb(var(--c-brand-50) / <alpha-value>)',
          '100': 'rgb(var(--c-brand-100) / <alpha-value>)',
          '200': 'rgb(var(--c-brand-200) / <alpha-value>)',
          '300': 'rgb(var(--c-brand-300) / <alpha-value>)',
          '400': 'rgb(var(--c-brand-400) / <alpha-value>)',
          '500': 'rgb(var(--c-brand-500) / <alpha-value>)',
          '600': 'rgb(var(--c-brand-600) / <alpha-value>)',
          '700': 'rgb(var(--c-brand-700) / <alpha-value>)',
          '800': 'rgb(var(--c-brand-800) / <alpha-value>)',
          '900': 'rgb(var(--c-brand-900) / <alpha-value>)'
        },
        ink: {
          '950': 'rgb(var(--c-ink-950) / <alpha-value>)',
          '900': 'rgb(var(--c-ink-900) / <alpha-value>)',
          '800': 'rgb(var(--c-ink-800) / <alpha-value>)',
          '700': 'rgb(var(--c-ink-700) / <alpha-value>)',
          '600': 'rgb(var(--c-ink-600) / <alpha-value>)',
          '500': 'rgb(var(--c-ink-500) / <alpha-value>)',
          '400': 'rgb(var(--c-ink-400) / <alpha-value>)',
          '300': 'rgb(var(--c-ink-300) / <alpha-value>)',
          '200': 'rgb(var(--c-ink-200) / <alpha-value>)',
          '100': 'rgb(var(--c-ink-100) / <alpha-value>)'
        },
        surface: {
          DEFAULT: 'rgb(var(--c-surface-default) / <alpha-value>)',
          card: 'rgb(var(--c-surface-card) / <alpha-value>)',
          border: 'rgb(var(--c-surface-border) / <alpha-value>)',
          muted: 'rgb(var(--c-surface-muted) / <alpha-value>)'
        },
        success: {
          DEFAULT: 'rgb(var(--c-success-default) / <alpha-value>)',
          bg: 'rgb(var(--c-success-bg) / <alpha-value>)'
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning-default) / <alpha-value>)',
          bg: 'rgb(var(--c-warning-bg) / <alpha-value>)'
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger-default) / <alpha-value>)',
          bg: 'rgb(var(--c-danger-bg) / <alpha-value>)'
        },
        info: { DEFAULT: '#1d4ed8', bg: '#e3edfd' },
        // Tonos pastel de las tarjetas de estadísticas (fondo, borde,
        // texto de la etiqueta), como en el dashboard de referencia.
        tono: {
          indigo: { bg: '#ecebfd', borde: '#d6d3fb', texto: '#5b4ae6' },
          verde: { bg: '#e4f7ec', borde: '#c3ecd3', texto: '#15803d' },
          azul: { bg: '#e6f0fd', borde: '#c9dcf9', texto: '#1d64d8' },
          ambar: { bg: '#fbf2de', borde: '#f2dfb2', texto: '#b45309' },
          rosa: { bg: '#fce9f2', borde: '#f5cde0', texto: '#be185d' },
          teal: { bg: '#e0f5f3', borde: '#bce7e2', texto: '#0f766e' }
        },
        // Alias retro-compatibles (algunos componentes viejos los usan)
        verde: {
          DEFAULT: '#6f60f1',
          fuerte: '#5b4ae6',
          suave: '#f1f0ff',
          borde: '#cec8fe'
        },
        navy: '#191c2e',
        fondo: '#f3f4f8'
      },
      boxShadow: {
        panel: 'var(--sombra-panel)',
        card: 'var(--sombra-card)',
        popover: '0 16px 40px -10px rgba(25, 28, 46, 0.25)',
        boton: '0 8px 20px -8px rgba(91, 74, 230, 0.65)'
      },
      borderRadius: {
        panel: 'var(--radio-panel)',
        card: 'var(--radio-card)'
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
    // Se mapean los tokens de marca (brand/success/warning/danger) a los
    // slots semánticos de HeroUI en vez de aceptar su paleta por defecto.
    heroui({
      themes: {
        light: {
          colors: {
            background: '#f3f4f8',
            foreground: '#191c2e',
            primary: {
              50: '#f1f0ff',
              100: '#e5e2ff',
              200: '#cec8fe',
              300: '#ada3fc',
              400: '#8c7ef8',
              500: '#6f60f1',
              600: '#5b4ae6',
              700: '#4b3bca',
              800: '#3e33a3',
              900: '#342d80',
              DEFAULT: '#5b4ae6',
              foreground: '#ffffff'
            },
            success: { DEFAULT: '#15803d', foreground: '#ffffff' },
            warning: { DEFAULT: '#b45309', foreground: '#ffffff' },
            danger: { DEFAULT: '#dc2626', foreground: '#ffffff' }
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
