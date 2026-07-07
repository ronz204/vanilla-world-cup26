# CLAUDE.md — Vanilla World Cup 26

## Qué es este proyecto

SPA de JavaScript vanilla (sin frameworks) construida con **Vite**, que consume la API REST pública del Mundial 2026 (`https://worldcup26.ir`). Es un laboratorio universitario individual con énfasis en manejo de estado, resiliencia ante fallos de red, y un micro-framework de reactividad hecho a mano.

Los **5 subproyectos son de entrega obligatoria**: Dream Team, Buscador Cara a Cara, Seguidor de Sorpresas, Quiniela Local, Simulador de Sorteo Loco. Se empieza por Dream Team (diseño más avanzado), pero `src/context/` y `src/shared/http/` deben soportar los 5 desde el día uno.

---

## Stack

- **Build**: Vite 8 (vanilla template, sin plugin de framework)
- **Lenguaje**: JavaScript ES modules — sin TypeScript
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite` plugin)
- **Persistencia**: `localStorage` exclusivamente — no hay backend propio
- **HTTP**: `fetch` nativo con `async/await`
- **Runtime de dev**: `bun` (package manager + runner) → `bun run dev`

---

## Estructura del proyecto

```
src/
  splice.js               # Entry point — monta el router en #app
  style.css               # CSS global (Tailwind + tokens CSS)
  context/                # Micro-framework propio
    store.js              # store(initial) → { get, set, subscribe, reset, destroy }
    routing.js            # route(pattern, view) + router(routes, outlet)
    component.js          # component(root, store, render) — reactive mount
    delegate.js           # delegate(root, event, selector, handler) — event delegation
    escape.js             # html`…` tagged template con XSS escaping; raw(str) para HTML seguro
  shared/
    http/
      client.js           # cliente HTTP centralizado: get/post/put/patch/delete
      auth.js             # getToken / saveToken / clearToken / hasToken (key: wc26:token)
      cache.js            # cache.get/set/clear (localStorage, key prefix: wc26:)
      retries.js          # MAX_ATTEMPTS=4, getDelay(attempt)=1000*2^attempt, wait(ms, onTick)
      errors.js           # HttpError, AuthError(401), RateLimitError(429), ServerError(500), NetworkError
  features/
    authen/               # Feature de autenticación (implementada)
      api.js              # Llamadas a /auth/register y /auth/authenticate
      view.js             # renderLogin(outlet) — usa store + component + delegate
      styles.js           # Clases Tailwind agrupadas por slot (objeto `wind`)
      errors.js           # matcher(err) → string de error legible para el usuario
      valids.js           # validate({ email, password }) → string | null
```

### Aliases de path (vite.config.js)

| Alias | Resuelve a |
|---|---|
| `@context` | `src/context/` |
| `@shared` | `src/shared/` |
| `@features` | `src/features/` |
| `@assets` | `src/assets/` |

### Proxy de API (dev)

Vite reescribe `/api/*` → `https://worldcup26.ir/*`. Todo `fetch` en el cliente usa `/api` como base, nunca la URL real directamente. El `client.js` ya tiene `BASE_URL = '/api'`.

---

## Cómo funciona el micro-framework (`src/context/`)

### `store(initial)`

```js
const state = store({ status: "idle", count: 0 });
state.get()           // snapshot inmutable actual
state.set({ count: 1 }) // merge parcial + notifica suscriptores (no notifica si no cambia nada)
state.subscribe(fn)   // retorna un unsubscribe()
state.destroy()       // limpia todos los suscriptores (llamar en el cleanup del router)
```

### `component(root, store, render)`

Monta un componente reactivo: llama `render(state)` de entrada y cada vez que el store notifica. `render` debe devolver un string HTML. Retorna el `unsubscribe` del store.

```js
component(outlet, state, ({ status }) => html`<p>${status}</p>`);
```

### `router(routes, outlet)` + `route(pattern, view)`

Router basado en `location.hash`. Cada `view(outlet, params)` puede devolver un cleanup que el router llama al salir de la ruta.

```js
router([
  route('/', renderLogin),
  route('/home', renderHome),
  route('/team/:id', renderTeam),
], document.querySelector('#app'));
```

### `html\`…\`` y `raw(str)`

Tagged template que escapa automáticamente los valores interpolados para prevenir XSS. Usar `raw(str)` solo cuando el HTML ya es seguro (ej. generado internamente, nunca de user input).

### `delegate(root, event, selector, handler)`

Event delegation eficiente. Usar siempre en vez de listeners directos en elementos dinámicos.

---

## Capa HTTP (`src/shared/http/`)

### `client.js`

Envuelve `fetch` con: inyección de JWT, manejo de 401/429/500, backoff exponencial (4 intentos: 1s, 2s, 4s, 8s), y caché en `localStorage`.

```js
// Opciones de client.get:
client.get('/get/teams', {
  cacheTtl: 60_000,   // ms — si hay entrada fresca, la retorna sin ir a la red
  skipCache: false,   // true para forzar fetch aunque haya caché
  onRetryTick: (s) => updateCountdown(s),  // callback con segundos restantes (para 429/500)
});
```

**Flujo de errores que lanza el client:**
- `AuthError` (401) → no reintenta, lanza inmediatamente
- `RateLimitError` (429) → reintenta con backoff
- `ServerError` (500) → reintenta con backoff
- `NetworkError` → reintenta con backoff
- `HttpError` 400/404 → lanza inmediatamente sin reintentar

### Patrón para consumir el client en una feature

```js
try {
  const data = await client.get('/get/teams', { cacheTtl: 30_000 });
  state.set({ teams: data, status: 'ok' });
} catch (err) {
  if (err instanceof AuthError) {
    clearToken();
    showSessionExpiredModal();  // nunca location.reload()
    return;
  }
  const cached = cache.get('/get/teams');
  if (cached) {
    state.set({ teams: cached.data, status: 'stale' });
  } else {
    state.set({ status: 'error' });
  }
}
```

### Polling

Para el Seguidor de Sorpresas (y cualquier subproyecto que necesite "tiempo real"):

```js
let timer = setInterval(async () => {
  // fetch con client, comparar snapshot anterior vs nuevo, actualizar estado
}, POLL_INTERVAL_MS);  // ajustar al rate limit: max 120 req/min por IP
// cleanup: clearInterval(timer) en el destroy de la vista
```

---

## API pública — worldcup26.ir

**Base URL (dev):** `/api` (proxy Vite → `https://worldcup26.ir`)

### Auth

| Endpoint | Método | Body |
|---|---|---|
| `/auth/register` | POST | `{ name, email, password }` |
| `/auth/authenticate` | POST | `{ email, password }` |

Respuesta: `{ user: {...}, token: "eyJ..." }`. El token dura **84 días** — no hay refresh.

### Endpoints de datos (todos requieren JWT)

| Endpoint | Descripción |
|---|---|
| `GET /get/teams` | 48 equipos clasificados |
| `GET /get/team/{id}` | Equipo por id |
| `GET /get/team/?name={name}` | Búsqueda por nombre |
| `GET /get/teams/?group={letra}` | Equipos de un grupo (A–L) |
| `GET /get/groups` | 12 tablas de posiciones |
| `GET /get/group/{id}` / `?name={letra}` | Un grupo |
| `GET /get/games` | 104 partidos del torneo |
| `GET /get/game/{id}` | Un partido |
| `GET /get/stadiums` | 16 estadios |
| `GET /health` | Health check (sin auth) |

### Gotchas críticos de la API (leer antes de codear)

1. **Las respuestas de lista vienen envueltas en un objeto**, no como array plano. `GET /get/teams` devuelve `{ "teams": [...] }`, `GET /get/games` devuelve `{ "games": [...] }`. Acceder a `.teams` / `.games` antes de usar el array — no asumir que `client.get()` devuelve el array directamente. El `client` cachea el objeto envuelto tal cual, así que los lectores de caché también deben desenvolver.
2. **`finished` es string, no boolean** — `"TRUE"` / `"FALSE"` en mayúsculas. Comparar `game.finished === "TRUE"`, no `=== true`.
2. **Números como strings** — `home_score`, `away_score`, `pts`, `gf`, `ga` llegan como `"0"`, `"2"`, etc. Hacer `Number(...)` o `parseInt(...)` antes de sumar para evitar concatenación de strings en vez de suma.
3. **Partidos de knockout sin equipos definidos** — `home_team_id: "0"`, sin `home_team_name_en`; usan `home_team_label` / `away_team_label`. El código no puede asumir que siempre hay nombre real.
4. **No hay endpoint de refresh** — un 401 siempre implica re-login manual.
5. **Rate limit de `/get/*`: 120 req/min por IP**, no por usuario. En red compartida (universidad) el 429 aparece más rápido de lo esperado.

---

## Los 5 subproyectos

### 3.1 Dream Team (primero)

**Endpoints**: `GET /get/teams`, `GET /get/games`

- Seleccionar exactamente 11 equipos distintos de una lista buscable.
- Bloquear al llegar a 11 con mensaje visual en la lista (nunca `alert()`).
- Goles por equipo = suma de `home_score` (como local) + `away_score` (como visitante) en partidos con `finished === "TRUE"`.
- Total de goles del Dream Team se actualiza en tiempo real al agregar/quitar equipos.
- Si falla la petición de goles de un equipo: ese equipo queda con estado "pendiente", el total excluye ese valor **sin producir `NaN`**.

### 3.2 Buscador Cara a Cara

**Endpoints**: `GET /get/team/?name=`, `GET /get/games`, `GET /get/groups`

- Dos inputs de búsqueda con debounce 300–500 ms.
- Al confirmar ambos equipos: `Promise.all` para traer datos en paralelo.
- Comparativa lado a lado: bandera, grupo, puntos.
- Si comparten grupo, mostrar el partido entre ellos (filtrado de `/get/games`).
- Si una promesa falla y la otra resuelve: mostrar la columna que funcionó, error local en la afectada.

### 3.3 Seguidor de Sorpresas

**Endpoints**: `GET /get/games`, `GET /get/teams`

- Marcar favoritos guardados en `localStorage`.
- Polling periódico sobre `/get/games` con intervalo configurable.
- Detectar si un favorito está perdiendo → alerta visual no bloqueante (banner/badge, nunca `alert()`).
- Si un ciclo de polling falla: conservar último marcador conocido, no resetear a "0-0".

### 3.4 Quiniela Local

**Endpoints**: `GET /get/games`, `GET /get/teams`

- Predicciones de marcador para partidos con `finished === "FALSE"`, guardadas en `localStorage` por id de partido.
- Al pasar a `finished === "TRUE"`: comparar predicción vs. resultado → marcador exacto / resultado correcto / fallo.
- Al abrir la app: leer predicciones de `localStorage` de inmediato, aunque la API esté caída.

### 3.5 Simulador de Sorteo Loco

**Endpoints**: `GET /get/teams`

- Obtener los 48 equipos reales.
- Fisher-Yates para mezclarlos → 12 grupos ficticios de 4.
- "Repetir sorteo" vuelve a mezclar el arreglo ya obtenido, **sin nueva petición a la API**.
- Sorteo guardado en `localStorage`; al refrescar se muestra el mismo sorteo anterior.

---

## Restricciones no negociables (el lab las evalúa en defensa oral)

Estas reglas nunca deben violarse, aunque simplifiquen algo:

| Prohibición | Alternativa correcta |
|---|---|
| `alert()` en cualquier contexto | Mensajes en el DOM (banner, badge, modal) |
| `.then()` / `.catch()` en cualquier archivo | `async/await` + `try/catch` exclusivamente |
| `window.location.reload()` para errores de sesión/red | Modal de "sesión expirada" + re-login sin reload |

**Comportamientos obligatorios:**

- `401` → `clearToken()` + modal de sesión expirada + opción de re-autenticarse
- `429` → countdown visible del próximo reintento (usar `onRetryTick` del `client.get`)
- `500` → backoff exponencial automático (ya lo maneja `client.js`)
- Cada request a `/get/*` lleva `Authorization: Bearer <token>` (lo inyecta `client.js`)
- Caché de `localStorage` se muestra con indicador "datos no actualizados" (`status: 'stale'`)

---

## Sistema de diseño — "Matchday Ticket"

Concepto: **mesa del fanático organizando su Mundial**. Fondo claro tipo papel, talón perforado separando header de contenido, sellos de color por estado. Referencia: boleto de entrada al estadio.

### Tokens CSS

```css
--bg:            #F6F5F0  /* fondo base — papel cálido */
--surface:       #FFFFFF  /* cards, paneles */
--surface-raised: #F0EFE8 /* elementos dentro de una card */
--border:        #DEDACC  /* bordes 1px */
--text:          #12203D  /* texto principal — navy oscuro */
--text-dim:      #6B7280  /* texto secundario, labels */
--accent:        #1E9E5A  /* verde cancha — acento puntual y success */
--gold:          #F2A93B  /* ámbar — goles, datos destacados */
--danger:        #E14F5A  /* errores, "perdiendo" */
--stale:         #9A9484  /* dato cacheado/desactualizado */
```

### Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | Space Grotesk | Títulos de sección |
| Body | Inter | UI, botones, labels |
| Data/mono | JetBrains Mono | Marcadores, goles, countdowns |

### Componente firma: Ticket Card

```html
<div class="ticket-card">
  <div class="ticket-card__stub">
    <span class="ticket-card__tag">DREAM TEAM</span>
    <span class="status-pill status-pill--live"><span class="dot"></span>En vivo</span>
  </div>
  <div class="ticket-card__perforation"></div>
  <div class="ticket-card__body"><!-- contenido --></div>
</div>
```

La línea punteada (`.ticket-card__perforation`) separa el stub del body en todas las vistas.

### Estados visuales

| Estado | Visualización |
|---|---|
| Cargando | Skeleton con shimmer (nunca spinner genérico) |
| Dato pendiente | Texto en `--text-dim` + badge en `--stale` |
| Dato cacheado | Badge pill en `--stale`: "Datos guardados · hace Xm" |
| Reintentando (429/500) | Status Pill en `--gold` + countdown mono: "Reintentando en 4s" |
| Sesión expirada (401) | Modal centrado, fondo difuminado, botón "Volver a iniciar sesión" |
| Error sin caché | Banner inline dentro del `ticket-card__body`, borde izquierdo en `--danger` |

### Shell de la app

```
┌─────────────────────────────────┐
│  SPLICE WC26    [● En vivo] [Nav]│  ← header --surface, línea --border abajo
├─────────────────────────────────┤
│  fondo --bg (papel)              │
│  #app — views tipo ticket card   │
└─────────────────────────────────┘
```

- El header nunca se re-renderiza al cambiar de ruta (solo `#app` / `outlet`).
- Mobile-first; Status Pill nunca se oculta.

### Microcopy

- Mensajes explican qué pasó y qué hace la app: *"No se pudo conectar. Reintentando en 4s."* — nunca solo "Error".
- Sin códigos HTTP visibles en pantalla ("Error 429" → "Demasiadas solicitudes. Reintentando…").
- Estados vacíos invitan a actuar: *"Elegí tu primer equipo para arrancar."*

---

## Cómo debe trabajar el copiloto en este repo

1. **No sugerir frameworks ni librerías de UI** sin evaluar primero si rompe la filosofía "vanilla + micro-framework propio". El objetivo del lab es construir esa capa a mano.
2. **Cualquier feature nueva** va en `src/features/<nombre>/` con la misma estructura que `authen/`: `api.js`, `view.js`, `styles.js` (clases Tailwind), y los módulos de errores/validación que hagan falta.
3. **Reutilizar siempre** `@context/*` y `@shared/http/*`. Nunca duplicar lógica de store, fetch, caché o retry en una feature.
4. **El código debe ser explicable en una defensa oral** — evitar abstracciones "mágicas" que el estudiante no pueda justificar. Si una decisión de diseño no es obvia, el copiloto debe poder explicarla en palabras simples.
5. **Antes de tocar la capa HTTP**, verificar que los cambios siguen cumpliendo todas las restricciones de la sección anterior.
6. **Commits en español o inglés**, sin emojis — seguir el estilo `feat(scope): descripción` ya establecido en el historial.
