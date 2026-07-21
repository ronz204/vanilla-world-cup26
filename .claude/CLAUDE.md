# CLAUDE.md — Vanilla World Cup 26

## Contexto

SPA de JavaScript vanilla (sin frameworks) construida con **Vite**, que consume la API REST pública del Mundial 2026 (`https://worldcup26.ir`). Laboratorio universitario individual — el código debe ser explicable en defensa oral.

- **Build**: Vite 8, vanilla template
- **Lenguaje**: JS ES modules — sin TypeScript
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Persistencia**: `localStorage` exclusivamente
- **HTTP**: `fetch` nativo con `async/await`
- **Dev**: `bun run dev`

---

## Aliases de path

| Alias | Resuelve a |
|---|---|
| `@context` | `src/context/` |
| `@shared` | `src/shared/` |
| `@features` | `src/features/` |
| `@assets` | `src/assets/` |

Proxy de dev: Vite reescribe `/api/*` → `https://worldcup26.ir/*`. Nunca usar la URL real directamente.

---

## Micro-framework — `src/context/`

> Esta capa es el núcleo. Siempre reutilizarla — nunca duplicar su lógica en features.

### `store.js` — `store(initial)`

```js
const state = store({ status: 'idle', teams: [] });

state.get()              // snapshot inmutable actual
state.set({ status: 'ok' })     // merge parcial — solo notifica si algo cambió
state.update(s => ({ count: s.count + 1 }))  // merge con función (evita stale closure)
state.subscribe(fn)      // fn(state) cada vez que cambia; retorna unsubscribe()
state.reset()            // vuelve a `initial` y notifica
state.destroy()          // limpia todos los suscriptores (llamar en cleanup de ruta)
```

La notificación es síncrona. `set` y `update` no notifican si ningún valor de clave cambió (comparación `===` por clave).

### `component.js` — `component(root, store, render)`

Monta un componente reactivo: llama `render(state)` de entrada y en cada cambio del store.

```js
const unsub = component(outlet, state, ({ status, teams }) =>
  html`<ul>${teams.map(t => html`<li>${t.name}</li>`)}</ul>`
);
// unsub() para desmontar
```

- `render` debe devolver un string HTML.
- Preserva el foco del elemento activo antes de re-renderizar (para inputs con `id` o `data-*`).
- Retorna el `unsubscribe` del store.

### `routing.js` — `route()` + `router()`

Router basado en `location.hash`.

```js
const nav = router([
  route('/', renderLogin),
  route('/dream-team', renderDreamTeam),
  route('/team/:id', renderTeam),   // params.id disponible
], outlet);

nav.navigate('/dream-team');  // cambia hash
nav.current();                // ruta actual sin '#'
```

- Cada `view(outlet, params)` puede retornar una función de cleanup que el router llama al salir.
- Rutas sin match muestran `<p>404</p>`.

### `guards.js` — `createGuards(shell)`

Wrappers de ruta para auth.

```js
const { withAuth, withLogin } = createGuards(shell);

// withAuth(view) — redirige a '/' si no hay token; muestra el shell
// withLogin(view) — redirige a '/dream-team' si ya hay token; oculta el shell
route('/dream-team', withAuth(renderDreamTeam))
route('/',           withLogin(renderLogin))
```

### `escape.js` — `html` + `raw()`

```js
import { html, raw } from '@context/escape.js';

html`<p>${userInput}</p>`          // escapa automáticamente — siempre usar para interpolaciones
raw('<span class="dot"></span>')   // marca HTML interno como seguro (nunca con user input)
```

`html` acepta arrays directamente: `html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>``

### `delegate.js` — `delegate(root, event, selector, handler)`

```js
const remove = delegate(outlet, 'click', '[data-add-team]', (e, target) => {
  const id = target.dataset.addTeam;
  // ...
});
// remove() para quitar el listener
```

Usar **siempre** en lugar de listeners directos en elementos dinámicos. Retorna la función de cleanup.

---

## Capa HTTP — `src/shared/http/`

### `client.js`

```js
import { client } from '@shared/http/client.js';

// GET con caché
const data = await client.get('/get/teams', {
  cacheTtl: 60_000,          // ms — retorna caché fresca sin ir a la red
  skipCache: false,           // true para forzar fetch
  onRetryTick: (s) => { },   // callback con segundos restantes (429/500)
});

// Otros métodos
client.post('/auth/authenticate', { email, password });
client.put('/endpoint', body);
client.patch('/endpoint', body);
client.delete('/endpoint');
```

**Flujo de errores:**

| Error | Comportamiento |
|---|---|
| `AuthError` (401) | Lanza inmediatamente, sin reintentar |
| `RateLimitError` (429) | Backoff exponencial, llama `onRetryTick` |
| `ServerError` (500+) | Backoff exponencial, llama `onRetryTick` |
| `NetworkError` | Backoff exponencial |
| `HttpError` (400, 404…) | Lanza inmediatamente |

Backoff: 4 intentos, delays 1 s / 2 s / 4 s / 8 s (`MAX_ATTEMPTS=4`, `getDelay(attempt)=1000*2^attempt`).

### `errors.js`

```js
import { HttpError, AuthError, RateLimitError, ServerError, NetworkError } from '@shared/http/errors.js';

// Jerarquía: AuthError, RateLimitError, ServerError extienden HttpError
//            NetworkError extiende Error (no HttpError)
err instanceof AuthError     // 401
err instanceof RateLimitError // 429
err instanceof ServerError   // 500+
err instanceof NetworkError  // sin red
err instanceof HttpError     // cualquier error HTTP (incluye los 3 anteriores)
```

### `cache.js`

```js
import { cache } from '@shared/http/cache.js';

cache.set('/get/teams', data)      // guarda en localStorage, key prefix 'wc26:'
cache.get('/get/teams')            // → { data, savedAt } | null
cache.clear('/get/teams')          // elimina la entrada
cache.extract('/get/teams', d => d.teams)  // → { data: [...], savedAt } | null
                                           // útil para leer caché sin desenvolver manualmente
```

El `client` cachea el objeto envuelto tal cual (`{ teams: [...] }`). Usar `cache.extract` o desenvolver en la feature.

### `auth.js`

```js
import { getToken, saveToken, clearToken, hasToken } from '@shared/http/auth.js';
// localStorage key: 'wc26:token'
```

### `helpers.js`

```js
import { extractTeams, extractGames, extractGroups, unwrap } from '@shared/http/helpers.js';

// Desenvolver respuestas envueltas de la API
const teams = extractTeams(data);   // data.teams o data (si ya es array)
const games = extractGames(data);
const groups = extractGroups(data);

// Para otros endpoints:
const custom = unwrap('stadiums', '/get/stadiums')(data);
```

### `retries.js`

```js
import { MAX_ATTEMPTS, getDelay, wait } from '@shared/http/retries.js';
// MAX_ATTEMPTS = 4
// getDelay(attempt) = 1000 * 2^attempt → 1000, 2000, 4000, 8000
// wait(ms, onTick?) — Promise con tick por segundo si onTick está presente
```

---

## Shared — `src/shared/`

### `shell/view.js` — `mountShell(el)`

```js
import { mountShell } from '@shared/shell/view.js';

const shell = mountShell(document.querySelector('#shell'));
shell.show()  // quita el atributo hidden (rutas autenticadas)
shell.hide()  // pone hidden (login)
```

Incluye nav con los 5 módulos, botón de logout (`clearToken()` + redirect a `/`), menú hamburguesa mobile. El header se actualiza en `hashchange` sin re-montar la vista completa.

### `utils.js`

```js
import { timeAgo } from '@shared/utils.js';

timeAgo(savedAt)  // savedAt = Date.now() en el momento del guardado
// → "hace menos de 1m" | "hace 5m" | "hace 2h"
```

---

## Patrón estándar de feature

```js
// api.js — solo llamadas, sin lógica de estado
import { client } from '@shared/http/client.js';
import { extractTeams } from '@shared/http/helpers.js';

export async function fetchTeams(opts) {
  const data = await client.get('/get/teams', opts);
  return extractTeams(data);
}

// view.js — orquesta store + component + delegate + cleanup
import { store } from '@context/store.js';
import { component } from '@context/component.js';
import { delegate } from '@context/delegate.js';
import { html, raw } from '@context/escape.js';
import { cache } from '@shared/http/cache.js';
import { AuthError } from '@shared/http/errors.js';
import { clearToken } from '@shared/http/auth.js';
import { timeAgo } from '@shared/utils.js';
import { fetchTeams } from './api.js';

export async function renderFeature(outlet, params) {
  const state = store({ status: 'loading', teams: [], error: null });

  const unsub = component(outlet, state, renderView);
  const cleanup1 = delegate(outlet, 'click', '[data-action]', handler);

  async function load() {
    try {
      const teams = await fetchTeams({ cacheTtl: 60_000, onRetryTick });
      state.set({ status: 'ok', teams });
    } catch (err) {
      if (err instanceof AuthError) { clearToken(); location.hash = '/'; return; }
      const entry = cache.extract('/get/teams', d => d.teams);
      if (entry) state.set({ status: 'stale', teams: entry.data, savedAt: entry.savedAt });
      else state.set({ status: 'error' });
    }
  }

  load();

  return () => { unsub(); cleanup1(); state.destroy(); };
}
```

### Estructura de archivos por feature

```
src/features/<nombre>/
  api.js        # llamadas HTTP — solo client.get/post y helpers
  view.js       # renderXxx(outlet, params) → cleanup fn
  styles.js     # objeto `wind` con clases Tailwind agrupadas por slot
  [lógica.js]   # módulos de negocio específicos (goals.js, draw.js, etc.)
```

### Features implementadas

| Ruta | Feature | Archivos extra |
|---|---|---|
| `/dream-team` | Dream Team | `goals.js` |
| `/head-to-head` | Buscador Cara a Cara | `compare.js` |
| `/tracker` | Seguidor de Sorpresas | `match.js` |
| `/quiniela` | Quiniela Local | `prediction.js` |
| `/draw` | Simulador de Sorteo Loco | `draw.js` |

---

## Gotchas críticos de la API

1. **Respuestas envueltas** — `GET /get/teams` → `{ teams: [...] }`. Usar `extractTeams(data)` o `data.teams`. El caché guarda el objeto envuelto; usar `cache.extract('/get/teams', d => d.teams)`.
2. **`finished` es string** — comparar `game.finished === "TRUE"`, nunca `=== true`.
3. **Números como strings** — `home_score`, `away_score`, `pts`, `gf`, `ga` llegan como `"0"`, `"2"`. Usar `Number(x)` antes de operar.
4. **Knockout sin equipos** — `home_team_id: "0"`, sin `home_team_name_en`; usar `home_team_label` / `away_team_label`.
5. **Sin refresh de token** — un 401 siempre implica re-login. `clearToken()` + redirect a `/`.
6. **Rate limit compartido** — 120 req/min por IP (no por usuario). En red universitaria el 429 aparece rápido.

### Endpoints de datos (todos requieren JWT)

| Endpoint | Descripción |
|---|---|
| `GET /get/teams` | 48 equipos clasificados |
| `GET /get/team/{id}` | Equipo por id |
| `GET /get/team/?name={name}` | Búsqueda por nombre |
| `GET /get/teams/?group={letra}` | Equipos de un grupo (A–L) |
| `GET /get/groups` | 12 tablas de posiciones |
| `GET /get/group/{id}` / `?name={letra}` | Un grupo |
| `GET /get/games` | 104 partidos |
| `GET /get/game/{id}` | Un partido |
| `GET /get/stadiums` | 16 estadios |
| `GET /health` | Health check (sin auth) |

---

## Restricciones del laboratorio (evaluadas en defensa oral)

| Prohibido | Alternativa |
|---|---|
| `alert()` | Mensajes en el DOM (banner, badge, modal) |
| `.then()` / `.catch()` | `async/await` + `try/catch` exclusivamente |
| `window.location.reload()` | Modal de sesión expirada + re-login sin reload |

**Comportamientos obligatorios:**

- `401` → `clearToken()` + modal/redirect a `/` (nunca reload)
- `429` / `500` → countdown visible (`onRetryTick`) — el `client` ya maneja el backoff
- `stale` → badge pill con `timeAgo(savedAt)` visible en la UI
- Todo request a `/get/*` lleva `Authorization: Bearer <token>` (lo inyecta `client.js`)

---

## Sistema de diseño — "Matchday Ticket"

### Tokens CSS

```css
--bg:             #F6F5F0   /* fondo base — papel cálido */
--surface:        #FFFFFF   /* cards, paneles */
--surface-raised: #F0EFE8   /* elementos dentro de card */
--border:         #DEDACC   /* bordes 1px */
--text:           #12203D   /* texto principal */
--text-dim:       #6B7280   /* texto secundario, labels */
--accent:         #1E9E5A   /* verde cancha — success */
--gold:           #F2A93B   /* ámbar — goles, countdowns */
--danger:         #E14F5A   /* errores, "perdiendo" */
--stale:          #9A9484   /* dato cacheado */
```

### Tipografía

| Rol | Fuente |
|---|---|
| Display / títulos | Space Grotesk |
| Body / UI / botones | Inter |
| Marcadores / goles / countdowns | JetBrains Mono |

### Componente Ticket Card

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

### Estados visuales

| Estado | Visualización |
|---|---|
| Cargando | Skeleton con shimmer (nunca spinner genérico) |
| Dato pendiente | Texto `--text-dim` + badge `--stale` |
| Dato cacheado | Badge pill `--stale`: "Datos guardados · hace Xm" (`timeAgo`) |
| Reintentando | Status Pill `--gold` + countdown mono: "Reintentando en 4s" |
| Sesión expirada | Modal centrado, fondo difuminado, botón "Volver a iniciar sesión" |
| Error sin caché | Banner inline, borde izquierdo `--danger` |

---

## Reglas para el copiloto

1. Siempre reutilizar `@context/*` y `@shared/http/*` — nunca duplicar store, fetch, caché o retry.
2. Features nuevas van en `src/features/<nombre>/` siguiendo la estructura de las existentes.
3. No sugerir frameworks ni librerías de UI.
4. Commits sin emojis: estilo `feat(scope): descripción` / `fix(scope): descripción`.
