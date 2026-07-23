# Guía de defensa oral — Vanilla World Cup 26

> Este documento complementa a [`splice.md`](./splice.md) (que cubre el micro-framework). Acá está todo lo demás: fundamentos de JS aplicados fuera de `src/context/`, la capa HTTP y su resiliencia, el mapeo de cada uno de los 5 subproyectos contra su "reto de resiliencia" pedido en `approach.md`, y cómo reproducir 401/429/500 en vivo frente al profesor sin que la app se rompa.

---

## 1. Guion de apertura (30–60 segundos)

"Es una SPA de JavaScript vanilla con Vite que consume la API pública del Mundial 2026. El foco no es el maquetado — es **manejo de estado sincronizado con el DOM** y **resiliencia ante fallos de red y de la API** (401, 429, 500). Para no repetir esa lógica en los 5 subproyectos, armé un micro-framework propio de ~110 líneas en `src/context/` (estado reactivo, componente, router, guards, templating seguro, delegación de eventos) y una capa HTTP centralizada en `src/shared/http/` que maneja token, caché, reintentos y backoff exponencial una sola vez para toda la app."

Con esa frase ya mostrás que entendés la diferencia entre "lo que se ve" y "lo que se evalúa".

---

## 2. La capa HTTP — `src/shared/http/`

### `client.js` — el único punto de contacto con `fetch`

```js
async function request(method, endpoint, { body, headers = {}, cacheTtl, skipCache, onRetryTick } = {}) {
  if (method === 'GET' && cacheTtl && !skipCache) {
    const entry = cache.get(endpoint);
    if (entry && (Date.now() - entry.savedAt) < cacheTtl) return entry.data;
  }

  const token = getToken();
  if (!token && endpoint !== '/auth/authenticate') throw new AuthError(endpoint);

  const reqHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(BASE_URL + endpoint, {
        method, headers: reqHeaders, cache: 'no-store',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (res.status === 401) throw new AuthError(endpoint);
      if (res.status === 429) throw new RateLimitError(endpoint);
      if (res.status >= 500) throw new ServerError(endpoint);
      if (!res.ok) throw new HttpError(res.status, res.statusText, endpoint);

      const data = await res.json();
      if (method === 'GET' && cacheTtl) cache.set(endpoint, data);
      return data;

    } catch (err) {
      const retryable = err instanceof ServerError
                     || err instanceof RateLimitError
                     || !(err instanceof HttpError);
      if (!retryable) throw err;

      lastErr = err instanceof HttpError ? err : new NetworkError(endpoint, err);
      if (attempt < MAX_ATTEMPTS - 1) await wait(getDelay(attempt), onRetryTick);
    }
  }
  throw lastErr;
}
```

**Fundamentos de JS a explicar acá:**

- **`async/await` exclusivo**: cada llamada a `fetch` se resuelve con `await` dentro de un `try/catch`. Nunca hay `.then()/.catch()` en el proyecto — se puede probar en vivo con `grep -rn "\.then(" src/` (da cero resultados).
- **Jerarquía de errores con `extends`** (`errors.js`): `AuthError`, `RateLimitError` y `ServerError` heredan de `HttpError`, que hereda de `Error`. `NetworkError` hereda directo de `Error` (no de `HttpError`) porque representa una falla *antes* de llegar a tener una respuesta HTTP (ej. sin conexión). Esto permite usar `instanceof` para decidir el flujo:
  ```js
  err instanceof AuthError      // 401 específico
  err instanceof HttpError      // cualquier error HTTP (401, 429, 500, 404...)
  ```
- **`retryable` — por qué 401 y 4xx normales NO reintentan**: la condición es `ServerError || RateLimitError || !(HttpError)`. Un 401 es `HttpError` pero no es `ServerError` ni `RateLimitError`, así que `retryable` da `false` y se relanza inmediatamente — coherente con la regla del lab: "un 401 siempre implica re-login", reintentar no tiene sentido si el token es inválido. Un error de red (`fetch` lanza `TypeError`, no es instancia de `HttpError`) sí es "retryable" vía `!(err instanceof HttpError)`.
- **Backoff exponencial (`retries.js`)**:
  ```js
  export const MAX_ATTEMPTS = 4;
  export function getDelay(attempt) { return 1000 * Math.pow(2, attempt); }
  ```
  4 intentos, delays `1000 * 2^0, 2^1, 2^2, 2^3` → 1s, 2s, 4s, 8s. `Math.pow` es la forma explícita de expresar la fórmula del backoff exponencial — se podría escribir `1000 * 2**attempt` (operador `**`), es la misma matemática.
- **Countdown visible con `setInterval` dentro de una `Promise`**:
  ```js
  export async function wait(ms, onTick = null) {
    return new Promise(resolve => {
      if (!onTick) { setTimeout(resolve, ms); return; }
      let remaining = Math.ceil(ms / 1000);
      onTick(remaining);
      const interval = setInterval(() => {
        remaining--;
        onTick(remaining);
        if (remaining <= 0) { clearInterval(interval); resolve(); }
      }, 1000);
    });
  }
  ```
  Este es un ejemplo clásico de **envolver una API basada en callbacks (`setTimeout`/`setInterval`) en una `Promise`**, para poder seguir usando `await wait(...)` desde `client.js` sin romper el estilo `async/await` del resto del código. `onTick` es un callback opcional inyectado por la feature (ej. `onRetryTick = s => state.set({ retryIn: s })`) que actualiza el store cada segundo — así nace el countdown "Reintentando en 4s" en la UI.
- **Caché sincronizada con la petición, no aparte**: `cache.get`/`cache.set` viven **dentro** de `request()`, no en un módulo separado que cada feature deba recordar llamar. Esto garantiza que toda petición GET con `cacheTtl` cachea automáticamente su respuesta exitosa, sin que ninguna feature se pueda "olvidar".

### `cache.js` — localStorage con manejo de errores

```js
export const cache = {
  set(endpoint, data) {
    try {
      localStorage.setItem(PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
    } catch { /* QuotaExceededError: dato no cacheado, app sigue funcionando */ }
  },
  ...
};
```
`try/catch` alrededor de `localStorage` en **todos** los puntos donde se escribe/lee — `localStorage` puede lanzar `QuotaExceededError` (cupo lleno) o estar deshabilitado (modo privado en algunos navegadores). El `catch` vacío es intencional: la app debe seguir funcionando sin caché antes que romperse por un error de almacenamiento. `cache.extract(endpoint, extractFn)` además envuelve el `extractFn` en su propio `try/catch` — si la forma cacheada no coincide con lo esperado, se descarta en vez de lanzar.

### `errors.js` — jerarquía de clases

```js
export class HttpError extends Error {
  constructor(status, message, endpoint) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.endpoint = endpoint;
  }
}
export class AuthError extends HttpError {
  constructor(endpoint) { super(401, "Session expired or invalid token", endpoint); this.name = "AuthError"; }
}
```
`super(message)` llama al constructor de `Error`, que setea `this.message`. `this.name = "AuthError"` sobreescribe el nombre por defecto ("Error") para que aparezca correctamente en `console.log`/stack traces — buena práctica al extender `Error` en JS que vale la pena mencionar si preguntan.

### `helpers.js` — desenvolver respuestas de la API

```js
export const unwrap = (key, endpoint) => (data) => {
  if (Array.isArray(data))        return data;
  if (Array.isArray(data?.[key])) return data[key];
  throw new Error(`${endpoint}: unexpected shape`);
};
export const extractTeams = unwrap('teams', '/get/teams');
```
`unwrap` es una **función que devuelve una función** (currying parcial): `unwrap('teams', '/get/teams')` fija los primeros dos argumentos y devuelve una función que solo necesita `data`. Resuelve el gotcha #1 de la API: `GET /get/teams` responde `{ teams: [...] }`, no un array pelado — con optional chaining `data?.[key]` se evita un `TypeError` si `data` es `null`/`undefined`.

---

## 3. Fundamentos de JS transversales (para cuando pregunten "explícame un concepto de JS que hayas aplicado")

| Concepto | Dónde | Por qué importa |
|---|---|---|
| **Closures** | `store.js`, `routing.js` (`currentDestroy`), `guards.js` (`shell` capturado) | Encapsulación sin clases; estado privado real |
| **Tagged template literals** | `escape.js` (`html\`\``) | Escape automático de XSS en cada interpolación |
| **Higher-order functions** | `guards.js` (`withAuth`, `withLogin`), `helpers.js` (`unwrap`) | Composición sin herencia |
| **`extends Error`** | `errors.js` | Jerarquía de errores tipada con `instanceof` |
| **`Promise` envolviendo callbacks** | `retries.js` (`wait`) | Integrar `setTimeout`/`setInterval` con `async/await` |
| **`Promise.allSettled`** | `dream-team/view.js`, `search-faced/view.js`, `quiniela-local/view.js` (`loadData`) | Peticiones paralelas donde un fallo no debe tumbar al resto |
| **Inmutabilidad (spread `...`)** | Todo `state.set`/`state.update` en toda feature | Permite que `===` en `store.js` detecte cambios correctamente |
| **`Map` para lookup O(1)** | `dream-team/view.js` (`teamById = new Map(...)`), `quiniela-local/view.js` | Evitar `.find()` en loop dentro de otro loop (O(n²)) |
| **`Set`** | `store.js` (subscribers) | Sin duplicados, `add`/`delete` O(1) |
| **Regex con named groups** | `routing.js` (`(?<id>[^/]+)`) | Parseo de parámetros de ruta |
| **Fisher-Yates** | `crazy-raffle/draw.js` (`shuffle`) | Aleatorización uniforme correcta (ver sección 5.5) |
| **`Number()` coerción explícita** | `goals.js`, `prediction.js`, `match.js` | La API devuelve números como strings (`"2"`) |
| **`try/catch` en localStorage** | `cache.js`, todos los `api.js` con persistencia propia | `QuotaExceededError` no debe romper la app |
| **Debounce evitado a propósito** | `search-faced` (ver 5.2) | Filtrado 100% client-side, cero llamadas por tecla |
| **Event delegation (`closest`)** | `delegate.js` | Listeners que sobreviven a re-renders vía `innerHTML` |

---

## 4. `401` en la práctica — dónde se resuelve

Regla obligatoria: `401` → `clearToken()` + redirect a `/`, nunca `reload()`.

Puntos donde se implementa (buscá estos si te piden "mostrame en el código"):
- `client.js:15` — si no hay token guardado, ni siquiera se hace el `fetch`: se lanza `AuthError` de entrada (excepto para `/auth/authenticate`).
- `client.js:32` — si el servidor responde 401 real, se lanza `AuthError` igual.
- En cada `loadData`/`load*` de cada feature (ej. `dream-team/view.js:255-258`):
  ```js
  const authErr = [teamsResult, gamesResult].find(r => r.status === 'rejected' && r.reason instanceof AuthError);
  if (authErr) { clearToken(); location.hash = '/'; return; }
  ```
  `location.hash = '/'` dispara `hashchange` → el router vuelve a resolver → `withLogin(renderLogin)` — sin ningún `reload()`.

---

## 5. Los 5 subprograma — reto de resiliencia y dónde está resuelto

### 5.1 Dream Team (`src/features/dream-team/`)

**Reto pedido**: si falla el cálculo de goles de un equipo, debe mostrar "pendiente" y el total **nunca** debe dar `NaN`.

Resuelto en `goals.js`:
```js
export function totalGoals(selected, allGames, gamesStatus) {
  if (gamesStatus !== 'ok' && gamesStatus !== 'stale') return null;   // ← clave
  return selected.reduce((acc, id) => acc + calcGoals(id, allGames), 0);
}
```
Si `gamesStatus` es `'error'` o `'loading'`, la función devuelve `null` **antes** de intentar sumar — nunca llega a hacer `acc + undefined` (que daría `NaN`). En `view.js:212-215`, el footer chequea `total !== null` para mostrar el número o un guión (`—`). El total se calcula sobre **todo el conjunto de partidos disponible** (`gamesStatus === 'ok' || 'stale'`), así que basta con que la petición de juegos haya tenido éxito alguna vez (o haya caché) para tener un número consistente; si nunca hubo éxito ni caché, se muestra `—` en vez de romper.

### 5.2 Buscador Cara a Cara (`src/features/search-faced/`)

**Reto pedido** (según `approach.md`): debounce 300–500ms + `Promise.all`.

**Lo realmente implementado, y por qué es una mejora defendible:**
- No hay debounce con `setTimeout` porque no hace falta: `loadTeams(state)` trae **los 48 equipos una sola vez** al montar la vista (`view.js:305`, cacheado 300s), y el filtrado de sugerencias (`filterTeams` en `view.js:20-27`) es un `.filter()` en memoria sobre ese array — cero llamadas de red por tecla. Si te preguntan "¿dónde está el debounce?", la respuesta correcta es: **se eliminó la necesidad del debounce resolviendo el problema de raíz** — no hay petición que debouncear porque el buscador no llama a la API en cada tecla, solo filtra datos ya cargados. Es más resiliente que un debounce con red (nada que reintentar, nada que se rompa si hay 429).
- Se usa `Promise.allSettled` (no `Promise.all`) en `runCompare` (`view.js:349`) — deliberado: `Promise.all` **rechaza entero** si una sola promesa falla, lo cual violaría el reto de resiliencia. `Promise.allSettled` siempre resuelve con el estado de cada una (`fulfilled`/`rejected`) sin importar si otras fallan.

**Reto de resiliencia**: si games o groups falla, la otra columna igual se pinta:
```js
const games  = gamesResult.status === 'fulfilled'  ? gamesResult.value  : api.gamesFromCache()?.data ?? null;
const groups = groupsResult.status === 'fulfilled' ? groupsResult.value : api.groupsFromCache()?.data ?? null;
```
Cada fuente de datos cae a su propia caché de forma **independiente** — un fallo en `groups` no descarta el resultado ya obtenido de `games`, ni viceversa (`view.js:358-372`).

### 5.3 Seguidor de Sorpresas (`src/features/lucky-surprise/`)

**Reto pedido**: polling que no resetee el marcador a 0-0 ni apague la alerta ante un fallo temporal.

Resuelto en `view.js:270-289` (`fetchAndUpdateGames`):
```js
} catch (err) {
  if (err instanceof AuthError) { clearToken(); location.hash = '/'; return; }
  state.set({ retryIn: null });
  const cached = api.gamesFromCache();
  if (cached) {
    state.set({ games: cached.data, gamesStatus: 'stale', gamesSavedAt: cached.savedAt });
  } else if (state.get().games.length > 0) {
    state.set({ gamesStatus: 'stale' });   // ← conserva el array en memoria, solo cambia el badge
  } else {
    state.set({ gamesStatus: 'error' });
  }
}
```
Hay **tres niveles de fallback**, en orden: (1) caché de `localStorage` si existe, (2) si no hay caché pero ya había datos en memoria de un ciclo anterior exitoso, **no se tocan** — solo se marca `gamesStatus: 'stale'`, (3) recién si nunca hubo datos, se marca `'error'`. En ningún caso se hace `state.set({ games: [] })`, así que el marcador (`getMatchStatus` en `match.js`) sigue calculándose sobre el último dato real conocido.

**Polling con `setInterval` reconfigurable**:
```js
const startPolling = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => fetchAndUpdateGames(state, true), state.get().pollInterval * 1_000);
};
```
`skipCache = true` en el tick de polling (`view.js:311`) fuerza ir siempre a la red, ignorando la caché de `cacheTtl` — a diferencia de la carga inicial (`fetchAndUpdateGames(state)` sin `skipCache`, `view.js:354`) que sí puede devolver caché fresca sin golpear la red. Cambiar el intervalo desde el `<select>` limpia el timer viejo (`clearInterval`) antes de crear uno nuevo — evita **timers duplicados acumulándose** (un bug clásico de `setInterval` sin cleanup).

### 5.4 Quiniela Local (`src/features/quiniela-local/`)

**Reto pedido**: las predicciones deben leerse de `localStorage` y mostrarse de inmediato, incluso con la API caída.

Resuelto en `view.js:333-345`:
```js
export function renderQuiniela(outlet) {
  const state = store({
    ...
    predictions: api.loadPredictions(),   // ← síncrono, ANTES de cualquier fetch
    ...
  });
  component(outlet, state, render);   // ya pinta las predicciones guardadas
  ...
  loadData(state);   // el fetch de partidos es asíncrono y llega después
```
`api.loadPredictions()` (`api.js:13-15`) lee de `localStorage` de forma **síncrona** en el momento de construir el store inicial — antes de que exista ninguna promesa pendiente. El primer `paint()` de `component()` ya tiene las predicciones disponibles, sin esperar la red. `evaluate()` (`prediction.js:23-30`) compara predicción vs resultado real solo para partidos `finished === 'TRUE'` — la comparación se actualiza cuando `loadData` finalmente resuelve `games`, sin bloquear el render inicial.

### 5.5 Simulador de Sorteo Loco (`src/features/crazy-raffle/`)

**Reto pedido**: Fisher-Yates correcto + `/get/teams` solo una vez por sesión + persistir el sorteo en `localStorage`.

**Fisher-Yates (`draw.js:1-8`):**
```js
export function shuffle(arr) {
  const a = [...arr];                              // copia — no muta el array original
  for (let i = a.length - 1; i > 0; i--) {          // de atrás para adelante
    const j = Math.floor(Math.random() * (i + 1));  // índice aleatorio en [0, i]
    [a[i], a[j]] = [a[j], a[i]];                     // swap con destructuring
  }
  return a;
}
```
Por qué es Fisher-Yates y no "cualquier shuffle": el loop va desde el último índice hacia el primero, y en cada paso `i` elige un índice aleatorio **entre 0 e `i` inclusive** (`Math.floor(Math.random() * (i + 1))`) — no entre 0 y `length-1` fijo. Esto es lo que garantiza distribución uniforme (cada permutación es igualmente probable); un error común (y que te pueden pedir detectar) sería usar `Math.random() * arr.length` en cada iteración sin achicar el rango, lo cual sesga el resultado. El swap `[a[i], a[j]] = [a[j], a[i]]` es **destructuring assignment** usado para intercambiar dos posiciones de array sin variable temporal.

**Persistencia y "solo pedir una vez" (`view.js:164-193`):**
```js
export function renderDraw(outlet) {
  const saved = api.loadDraw();   // localStorage, síncrono
  const state = store({
    draw: saved?.groups ?? null,
    drawSavedAt: saved?.createdAt ?? null,
    ...
  });
  ...
  loadTeams(state);   // trae teams para poder "Repetir sorteo"; si YA hay `draw` guardado, no genera uno nuevo
}
async function loadTeams(state) {
  ...
  state.set({ allTeams: teams, teamsStatus: 'ok' });
  if (!state.get().draw) makeDraw(state, teams);   // ← solo arma sorteo si no había uno guardado
}
```
Si el usuario refresca, `api.loadDraw()` recupera el sorteo anterior de forma síncrona y se ve de inmediato — `loadTeams` igual corre (para habilitar el botón "Repetir sorteo"), pero el `if (!state.get().draw)` evita pisar un sorteo ya existente con uno nuevo. "Repetir sorteo" (`view.js:178-184`) llama `makeDraw(state, allTeams)` reusando el array de equipos **ya en memoria** — nunca vuelve a golpear `/get/teams`. Además, `api.js:8` cachea `/get/teams` con TTL de 24 horas (`24 * 60 * 60 * 1000`) — el mayor de todo el proyecto, justificado en un comentario: los 48 equipos no cambian durante el torneo.

---

## 6. Cómo reproducir 401 / 429 / 500 en vivo (DevTools) sin romper la app

### 401 — el más fácil y confiable

En la consola del navegador, con la app ya autenticada:
```js
localStorage.removeItem('wc26:token')
```
Después navegá a cualquier ruta protegida o hacé click en "Reintentar" en cualquier feature. `client.js:15` detecta que no hay token y lanza `AuthError` **sin siquiera llamar a `fetch`** — vas a ver el `catch` de la feature limpiando el token (ya estaba limpio) y redirigiendo a `/` con `location.hash = '/'`. Mostrá en el tab Network que **no hubo ningún request** — la app cortó antes de tocar la red.

### 500 — usando el proxy de Vite (así lo dejó preparado el propio proyecto)

En `vite.config.js` hay una línea comentada pensada exactamente para esto:
```js
server: {
  proxy: {
    "/api": {
      changeOrigin: true,
      target: "https://worldcup26.ir",
      /* target: "http://127.0.0.1:1", */   // ← descomentar esta y comentar la de arriba
      rewrite: (path) => path.replace(/^\/api/, ""),
    },
  },
},
```
Comentá la línea de `target: "https://worldcup26.ir"` y descomentá `target: "http://127.0.0.1:1"` (un puerto que nadie escucha), reiniciá `bun run dev`, y cualquier request a `/api/*` fallará a nivel de proxy — el navegador va a recibir un error 5xx del servidor de desarrollo. Vas a ver en la UI el Status Pill cambiar a "Reintentando en Xs" con el countdown bajando 8s → 4s → 2s → 1s (el backoff exponencial de `retries.js`), y si hay caché previa, el badge de "Datos guardados · hace Xm". **Importante**: revertí el cambio en `vite.config.js` después de la demo (volvé a comentar `127.0.0.1:1` y descomentar la URL real) — es una modificación local de configuración, no algo para dejar commiteado.

### 429 — honestidad ante el profesor

El rate limit real (120 req/min) es compartido por IP en la red universitaria — puede aparecer solo, sin forzar nada, si hay varios compañeros probando la API al mismo tiempo (gotcha #6 documentado en `CLAUDE.md`). Si no aparece naturalmente, la explicación correcta y honesta es: **`RateLimitError` comparte exactamente el mismo camino de código que `ServerError`** en `client.js` (`retryable = ServerError || RateLimitError || ...`) — demostrar el 500 con el proxy ya prueba que el backoff y el countdown funcionan idénticamente para 429, la única diferencia es qué status code dispara qué clase de error. No hace falta fingir un 429 si podés mostrar en el código que la rama es la misma.

---

## 7. Checklist final antes de la defensa (de `approach.md` sección 4)

- [ ] Cero `alert()` en el proyecto — verificable con búsqueda de texto.
- [ ] Cero `.then()/.catch()` — verificable con búsqueda de texto (`\.then\(`).
- [ ] Cero `location.reload()` — verificable con búsqueda de texto.
- [ ] Cada `client.get/post/put/patch/delete` termina inyectando `Authorization: Bearer <token>` (`client.js:19`), excepto `/auth/authenticate`.
- [ ] Los 5 subproyectos conviven en la misma SPA sin duplicar lógica — todos importan `store`, `component`, `delegate`, `html` de `@context/*` y `client`, `cache`, `auth`, `helpers` de `@shared/http/*` (ver `splice.js` para la lista completa de rutas montadas).
- [ ] Podés reproducir 401 y 500 en vivo (sección 6) y explicar qué parte del código reacciona en cada caso.
- [ ] Podés explicar el bug de "mutar en vez de reemplazar" en `store.js` sin dudar (sección 1 de `splice.md`).
