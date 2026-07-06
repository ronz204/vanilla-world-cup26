---
name: Matchday Ticket
colors:
  surface: '#f5fbf2'
  surface-dim: '#d5dcd3'
  surface-bright: '#f5fbf2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5ec'
  surface-container: '#e9f0e7'
  surface-container-high: '#e4eae1'
  surface-container-highest: '#dee4db'
  on-surface: '#171d18'
  on-surface-variant: '#3e4a3f'
  inverse-surface: '#2c322c'
  inverse-on-surface: '#ecf3ea'
  outline: '#6e7a6f'
  outline-variant: '#bdcabd'
  surface-tint: '#006d3a'
  primary: '#006a38'
  on-primary: '#ffffff'
  primary-container: '#008649'
  on-primary-container: '#f6fff4'
  inverse-primary: '#69dd92'
  secondary: '#515e7e'
  on-secondary: '#ffffff'
  secondary-container: '#ccd9ff'
  on-secondary-container: '#525f7f'
  tertiary: '#a03747'
  on-tertiary: '#ffffff'
  tertiary-container: '#c04f5e'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85faac'
  primary-fixed-dim: '#69dd92'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#00522a'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b9c6eb'
  on-secondary-fixed: '#0c1b37'
  on-secondary-fixed-variant: '#394665'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b8'
  on-tertiary-fixed: '#40000f'
  on-tertiary-fixed-variant: '#842133'
  background: '#f5fbf2'
  on-background: '#171d18'
  surface-variant: '#dee4db'
  bg-paper: '#F6F5F0'
  surface-raised: '#F0EFE8'
  border-muted: '#DEDACC'
  text-dim: '#6B7280'
  accent-gold: '#F2A93B'
  danger-stamp: '#E14F5A'
  stale-data: '#9A9484'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  '4': 4px
  '8': 8px
  '12': 12px
  '16': 16px
  '24': 24px
  '32': 32px
  '48': 48px
---

# Ui/Ux Design — Sistema de Diseño

## 1. Concepto rector
Panel de datos inspirado en un **boleto de partido**: fondo claro tipo papel, talón perforado que separa header de contenido, y sellos de color por estado. Referencia: artefacto físico del día de partido (entrada, marcador, gafete).

## 2. Tokens

### Color
| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#F6F5F0` | Fondo base — blanco cálido tipo papel |
| `--surface` | `#FFFFFF` | Cards, paneles |
| `--surface-raised` | `#F0EFE8` | Elementos sobre una card (rows, inputs) |
| `--border` | `#DEDACC` | Bordes sutiles, 1px |
| `--text` | `#12203D` | Texto principal — navy oscuro ("tinta de boleto") |
| `--text-dim` | `#6B7280` | Texto secundario, labels, timestamps |
| `--accent` | `#1E9E5A` | Verde cancha (acento puntual) |
| `--gold` | `#F2A93B` | Ámbar/dorado — datos destacados |
| `--success` | `#1E9E5A` | Conexión activa |
| `--danger` | `#E14F5A` | Errores |
| `--stale` | `#9A9484` | Dato cacheado |

### Tipografía
| Rol | Fuente | Uso |
|---|---|---|
| Display | Space Grotesk | Títulos de sección |
| Body | Inter | UI, botones, labels |
| Data / mono | JetBrains Mono | Marcadores, countdowns |

### Espaciado y forma
- Escala: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Radio: 10px (cards), 6px (botones), 999px (badges).
- Sombra sutil: `0 1px 2px rgba(18,32,61,0.06)`.

## 3. Elemento de firma: Ticket Card
Card con talón perforado arriba. Línea punteada separa "header de sello" del cuerpo.

## 4. Componentes base

### Botón primario
- BG: `--accent`
- Color: `#FFFFFF`

### Status Pill
- Pill con punto pulsante, tipografía Mono.
