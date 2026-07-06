# Ui/Ux Design — Sistema de Diseño

> Documento de contexto visual para el LLM copiloto. Objetivo: que cualquier vista nueva (de los 5 subproyectos) se sienta parte de la misma app, sin que cada una se vea "hecha por separado".

## 1. Concepto rector

Sigue siendo un panel de datos en vivo que puede fallar — eso no cambia. Lo que cambia es el tono: en vez de "sala de prensa a oscuras", ahora es **la mesa de un fanático organizando su Mundial** — de día, sobre papel, con la energía de una entrada de estadio. El objeto de referencia es el **boleto de partido**: fondo claro tipo papel, un talón perforado que separa "header" de "contenido", y un sello de color por estado en la esquina, como el sello de una entrada válida.

Se evita el cliché de "cancha de fútbol" literal (pasto, líneas blancas, balón) — la referencia es el **artefacto físico del día de partido** (entrada, marcador de estadio, gafete de acreditación), no la cancha en sí.

## 2. Tokens

### Color

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#F6F5F0` | Fondo base — blanco cálido tipo papel, no cream de folleto |
| `--surface` | `#FFFFFF` | Cards, paneles |
| `--surface-raised` | `#F0EFE8` | Elementos sobre una card (rows, inputs) |
| `--border` | `#DEDACC` | Bordes sutiles, 1px |
| `--text` | `#12203D` | Texto principal — navy oscuro, no negro puro (tono "tinta de boleto") |
| `--text-dim` | `#6B7280` | Texto secundario, labels, timestamps |
| `--accent` | `#1E9E5A` | Verde cancha — pero usado como acento puntual, nunca como fondo grande |
| `--gold` | `#F2A93B` | Ámbar/dorado — goles, logros, datos destacados |
| `--success` | `#1E9E5A` | Mismo verde — conexión activa, predicción acertada (reutiliza `--accent`) |
| `--danger` | `#E14F5A` | Errores, "perdiendo", predicción fallida |
| `--stale` | `#9A9484` | Dato cacheado/desactualizado — beige apagado, no gris frío (mantiene la calidez del papel) |

Dos acentos con roles fijos (verde = estado/acción, dorado = dato destacado) en vez de uno solo — encaja con la idea de "sellos de boleto" de distintos colores según qué certifican, pero se mantiene disciplinado: nunca un tercer color nuevo sin razón.

### Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Space Grotesk** | Títulos de sección, nombres de vista |
| Body | **Inter** | Texto de UI, botones, labels |
| Data / mono | **JetBrains Mono** | Marcadores, goles, countdowns, timestamps |

Se mantienen las mismas 3 fuentes del sistema anterior — el cambio es de paleta, no de tipografía; ya cumplían bien el rol de "dato en vivo se lee como instrumento".

### Espaciado y forma

- Escala en base 4px: `4 / 8 / 12 / 16 / 24 / 32 / 48`.
- Radio de esquina: `10px` en cards (ligeramente más redondeado que antes — más amigable), `6px` en botones/inputs, `999px` en badges de estado.
- Borde de 1px en `--border`, sin sombras duras — si se usa sombra, muy sutil (`0 1px 2px rgba(18,32,61,0.06)`) solo para separar cards del fondo papel.

## 3. Elemento de firma: Ticket Card

Toda card principal (equipo, partido, predicción) tiene un **talón perforado** arriba, como un boleto de entrada — la línea punteada separa un "header de sello" (estado + categoría) del contenido real.

```html
<div class="ticket-card">
  <div class="ticket-card__stub">
    <span class="ticket-card__tag">DREAM TEAM</span>
    <span class="status-pill status-pill--live"><span class="dot"></span>En vivo</span>
  </div>
  <div class="ticket-card__perforation"></div>
  <div class="ticket-card__body">
    <!-- contenido -->
  </div>
</div>
```

```css
.ticket-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
}
.ticket-card__stub {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: var(--surface-raised);
}
.ticket-card__tag {
  font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; color: var(--text-dim);
}
.ticket-card__perforation {
  height: 1px; margin: 0;
  background: repeating-linear-gradient(90deg, var(--border) 0 6px, transparent 6px 12px);
}
.ticket-card__body { padding: 20px; }
```

Este es el elemento que se repite en las 5 vistas — un Dream Team card, una fila de partido en Quiniela, un resultado en Buscador Cara a Cara, todos comparten el mismo talón perforado. Es el guiño "mundialista" sin caer en pasto ni balones.

### Status Pill (se mantiene, recoloreado)

```css
.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border);
  color: var(--text-dim); background: var(--surface);
}
.status-pill--live { color: var(--accent); border-color: rgba(30,158,90,0.3); background: rgba(30,158,90,0.08); }
.status-pill--live .dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
```

## 4. Componentes base

### Botón primario / secundario
```css
.btn {
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
  border-radius: 6px; padding: 8px 14px; cursor: pointer; border: 1px solid transparent;
}
.btn--primary { background: var(--accent); color: #FFFFFF; }
.btn--secondary { background: var(--surface); border-color: var(--border); color: var(--text); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

### Dato en vivo (marcador, goles, countdown)
```css
.live-number {
  font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 600;
  color: var(--text);
}
.live-number--gold { color: var(--gold); }
```

### Fila seleccionable (equipos, favoritos)
```css
.row {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface-raised); border: 1px solid var(--border);
  border-radius: 6px; padding: 10px 12px; font-size: 13px;
}
.row--selected { border-color: var(--accent); background: rgba(30,158,90,0.06); }
```

## 5. Patrones de estado

| Estado | Cómo se ve | Dónde aplica |
|---|---|---|
| **Cargando** | Skeleton (`--surface-raised` con shimmer sutil), nunca spinner genérico | Carga inicial de cualquier lista |
| **Dato pendiente** | Texto en `--text-dim` + badge "pendiente" en `--stale`, el número se omite del total | Dream Team |
| **Dato cacheado / offline** | Badge pill en `--stale` ("Datos guardados · hace Xm") | Vistas que leen `localStorage` como fallback |
| **Reintentando (429)** | Status Pill en `--gold`, countdown en mono: `Reintentando en 4s` | Vía Status Pill global |
| **Sesión expirada (401)** | Modal centrado, fondo difuminado detrás, botón único "Volver a iniciar sesión" en `--accent` | Global |
| **Error de red sin caché** | Banner inline dentro del `ticket-card__body` afectado, borde izquierdo en `--danger` | Cualquier card individual |
| **Vacío intencional** | Invitación a actuar: "Elegí tu primer equipo para arrancar" | Dream Team, Quiniela Local |

## 6. Layout / shell de la app

```
┌─────────────────────────────────────────────┐
│  SPLICE WC26          [● En vivo]  [Nav ▾]   │  ← header claro, fondo --surface
├─────────────────────────────────────────────┤
│  fondo --bg (papel)                          │
│   #outlet — cards tipo ticket por vista      │
└─────────────────────────────────────────────┘
```

- Header en `--surface` (blanco) sobre el fondo papel `--bg`, con línea inferior `--border` — se distingue por contraste tonal, no por color fuerte.
- El `#outlet` es donde vive cada `view.js`; el header nunca se re-renderiza al cambiar de ruta.
- Mobile-first: navegación colapsa a menú, Status Pill nunca se oculta.

## 7. Voz y microcopy

- Mensajes de error explican qué pasó y qué hace la app al respecto — nunca solo "Error".
  - Bien: *"No se pudo conectar. Reintentando en 4s."*
  - Mal: *"Error de red"*
- Sin lenguaje de sistema ("Error 429") visible en pantalla.
- Estados vacíos invitan a actuar.
- Tono cálido pero directo — como un anfitrión de estadio dando indicaciones claras, sin exclamaciones forzadas ni emojis.

## 8. Motion

- Transición de opacidad (150ms) al cambiar de vista.
- El pulso del Status Pill es la única animación ambiental continua.
- `transform: scale(0.98)` sutil en `:active` de botones y rows.

## 9. Accesibilidad mínima

- Contraste AA: `--text` (#12203D) sobre `--bg`/`--surface` cumple ampliamente al ser navy sobre blanco/papel claro.
- Foco de teclado visible en todo elemento interactivo.
- Ningún estado depende solo del color — Status Pill y badges siempre llevan texto además del color.