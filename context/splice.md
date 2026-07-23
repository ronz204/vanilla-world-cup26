# Splice — Guía de defensa del micro-framework (`src/context/`)

> Objetivo de este documento: que puedas explicar **línea por línea** cada archivo de `src/context/`, qué concepto fundamental de JavaScript aplica, y en qué feature real se usa. Está pensado para responder "¿por qué lo hiciste así?" sin quedarte en blanco.

Splice son 6 archivos, ~110 líneas en total. Ese es tu primer argumento de venta: **no es una librería que copiaste, es un framework tan chico que te lo sabés de memoria.**

```
src/context/
  store.js      → estado reactivo (pub/sub)
  component.js  → conecta estado con el DOM
  routing.js    → SPA routing por hash
  guards.js     → protección de rutas (auth)
  escape.js     → templating seguro (anti-XSS)
  delegate.js   → manejo de eventos
```

---

## 1. `store.js` — Estado reactivo con closures

```js
export function store(initial) {
  let state = initial;
  const subscribers = new Set();

  const notify = (next) => {
    if (Object.keys(next).every(k => next[k] === state[k])) return;
    state = next;
    subscribers.forEach(fn => fn(state));
  };

  return {
    get:     ()     => state,
    set:     (partial) => notify({ ...state, ...partial }),
    update:  (fn)   => notify({ ...state, ...fn(state) }),
    subscribe: (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); },
    reset:   ()     => { state = initial; subscribers.forEach(fn => fn(state)); },
    destroy: ()     => subscribers.clear(),
  };
}
```

### Qué es y qué problema resuelve

Es un **micro pub/sub** (patrón observador) para estado en memoria. Cualquier parte del código puede leer el estado (`get`), modificarlo (`set`/`update`) y cualquier otra parte puede reaccionar a los cambios (`subscribe`) — sin acoplar quién cambia el estado con quién lo pinta.

### Conceptos de JS aplicados (con ejemplos)

**1. Closures (el corazón del patrón)**
`state` y `subscribers` son variables locales de la función `store()`. No existen fuera de ella — no hay una clase con un campo público `this.state` que cualquiera pueda pisar desde afuera. El objeto que se retorna (`get`, `set`, etc.) son funciones que **capturan por closure** esas variables. Es el patrón de "módulo privado" clásico de JS: en vez de usar `class` con campos privados (`#state`), usás una función factory que cierra sobre variables locales.

> Pregunta típica: "¿por qué no usaste `class`?" → Respuesta: closures dan encapsulación real sin necesitar `#privateFields` (sintaxis más nueva) ni preocuparte por `this` y su binding. Cada instancia de `store()` es 100% independiente, no hay `new` ni riesgo de que alguien reasigne `state` desde afuera porque nunca se expone la variable, solo funciones que la tocan.

**2. `Set` para los suscriptores**
`subscribers` es un `Set`, no un array. Dos ventajas concretas:
- `add`/`delete` son O(1) y **evitan duplicados** automáticamente (si el mismo `paint` se suscribe dos veces, el Set solo lo guarda una vez).
- `subscribe` retorna directamente `() => subscribers.delete(fn)` — una función de cleanup lista para usar. Esto es lo que `component.js` devuelve como `unsubscribe`.

**3. Inmutabilidad con spread (`...`)**
```js
set: (partial) => notify({ ...state, ...partial })
```
Nunca se muta `state` directamente (`state.teams.push(...)` está prohibido en todo el proyecto). Se crea un objeto **nuevo** combinando el estado viejo con lo parcial. Esto es clave para el punto 4.

**4. Comparación shallow por clave — evita renders innecesarios**
```js
if (Object.keys(next).every(k => next[k] === state[k])) return;
```
`Object.keys(next).every(...)` recorre las claves del objeto propuesto y compara con `===` (igualdad estricta, por referencia en objetos/arrays) contra el estado actual. Si **todas** las claves son iguales, no notifica — no hay re-render.

Esto tiene una trampa que hay que saber explicar: la comparación es **shallow**. Si mutás un array/objeto interno en vez de reemplazarlo por uno nuevo, `===` seguirá dando `true` (misma referencia) y el store **no notificará**, aunque el contenido cambió. Por eso en toda feature vas a ver patrones como:
```js
// dream-team/view.js
state.update(s => ({ selected: [...s.selected, id] })); // array NUEVO
```
y nunca `s.selected.push(id)`. Esta es una decisión de diseño, no un accidente — te puede preguntar "¿qué pasa si mutás el array directamente?" y la respuesta correcta es: "el store no se entera, la comparación `===` sigue viendo la misma referencia, y la UI queda desincronizada silenciosamente". Es el bug más importante que hay que saber explicar de todo el framework.

**5. Dos formas de actualizar: `set` vs `update`, y por qué existen ambas**
```js
set:    (partial) => notify({ ...state, ...partial }),
update: (fn)      => notify({ ...state, ...fn(state) }),
```
`set` sirve cuando el valor nuevo no depende del anterior (`state.set({ search: 'brasil' })`). `update` recibe una función `fn(state)` y sirve cuando el valor nuevo **depende** del estado actual — evita el bug clásico de **stale closure**: si en un handler de evento capturás `state.get()` una sola vez y después hacés `.set()` con datos derivados de esa captura vieja, dos eventos casi simultáneos pueden pisarse entre sí. Con `update`, la función siempre recibe el estado más reciente en el momento de ejecutarse.

Ejemplo real (`dream-team/view.js`):
```js
delegate(outlet, 'click', '[data-dt-add]', (_, target) => {
  const id = target.dataset.dtAdd;
  state.update(s => {
    if (s.selected.length >= 11 || s.selected.includes(id)) return {};
    return { selected: [...s.selected, id] };
  });
}),
```
Si devolvieras `{}` desde `set` en vez de `update`, igual funcionaría acá porque no depende de un valor capturado antes — pero el patrón general del proyecto usa `update` cada vez que la nueva selección depende de `s.selected` actual, precisamente para no arrastrar un snapshot viejo.

**6. `reset()` vs `set`/`update`: notifica siempre, sin comparar**
```js
reset: () => { state = initial; subscribers.forEach(fn => fn(state)); },
```
Nótese que `reset` **no pasa por `notify`** — llama directo a `subscribers.forEach`. Es intencional: querés volver al estado inicial y repintar siempre, incluso si por casualidad el estado actual ya era idéntico al inicial.

**7. `destroy()` — limpieza de memoria**
```js
destroy: () => subscribers.clear(),
```
Cuando el router desmonta una vista (`routing.js` llama `currentDestroy()`), cada feature llama `state.destroy()`. Sin esto, el store seguiría reteniendo referencias a funciones `paint` de vistas que ya no existen — un **memory leak** clásico de SPA sin frameworks.

---

## 2. `component.js` — Reactividad conectada al DOM

```js
function snapshotFocus(root) {
  const el = document.activeElement;
  if (!root.contains(el) || !('selectionStart' in el)) return null;
  const key = el.id
    ? `#${el.id}`
    : (() => {
        const [k, v] = Object.entries(el.dataset ?? {})[0] ?? [];
        return k ? `[data-${k.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`)}="${v}"]` : null;
      })();
  return key ? { key, start: el.selectionStart, end: el.selectionEnd } : null;
}

export function component(root, store, render) {
  const paint = () => {
    const focus = snapshotFocus(root);
    root.innerHTML = render(store.get());
    if (focus) {
      const el = root.querySelector(focus.key);
      if (el) { el.focus(); el.setSelectionRange(focus.start, focus.end); }
    }
  };
  const unsubscribe = store.subscribe(paint);
  paint();
  return unsubscribe;
}
```

### Qué es

El puente entre `store.js` y el DOM real. `component(root, store, render)` hace: "cada vez que el store cambie, volvé a llamar `render(state)` y reemplazá el HTML de `root`".

### Conceptos de JS aplicados

**1. Re-render por fuerza bruta (`innerHTML`), no virtual DOM**
No hay diffing, no hay reconciliación tipo React. Cada cambio de estado **reescribe todo el subárbol HTML** dentro de `root`. Esta es una decisión consciente de simplicidad, no ignorancia: para el tamaño de este proyecto (listas de 48 equipos, 104 partidos) es perfectamente performante, y evita la complejidad enorme de un algoritmo de diffing. Es un trade-off explícito que hay que poder justificar: **simplicidad y explicabilidad por encima de performance en escala**, coherente con que el lab pide un framework "artesanal", no una librería de producción.

**2. El problema que resuelve `snapshotFocus`: pérdida de foco al re-renderizar**
Si reescribís `innerHTML` mientras el usuario está escribiendo en un `<input>`, el navegador destruye ese nodo DOM y crea uno nuevo — el usuario pierde el foco y el cursor salta al final o se cierra el teclado en mobile. Esto pasa constantemente en Splice porque **cada tecla en el buscador dispara un `state.set({ search: ... })`**, que dispara un re-render completo.

`snapshotFocus` soluciona esto en 3 pasos:
1. Antes de re-pintar, mira qué elemento tiene foco (`document.activeElement`) **solo si está dentro de `root`** (`root.contains(el)`).
2. Duck typing: `'selectionStart' in el` — es la forma de detectar si el elemento es un input/textarea de texto (tienen esa propiedad) sin necesitar `instanceof HTMLInputElement` (que fallaría, por ejemplo, si el input es de tipo checkbox, que no tiene `selectionStart`).
3. Construye un selector CSS único: si el elemento tiene `id`, usa `#id`; si no, arma un selector de atributo `[data-xxx="valor"]` a partir del **primer** par clave/valor de `el.dataset`.

**3. Regex: revertir el camelCase de `dataset`**
```js
k.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`)
```
El DOM expone atributos `data-team-id="5"` como `el.dataset.teamId` (camelCase automático). Para reconstruir el selector CSS original hay que ir al revés: cada letra mayúscula (`([A-Z])`) se reemplaza por un guion + la misma letra en minúscula. `teamId` → `team-Id` → función devuelve `-i` → resultado `team-id`. Es un detalle chico pero muy preguntable: "¿por qué ese regex?" — porque el dataset API transforma automáticamente `data-team-id` en `dataset.teamId`, y acá se necesita el proceso inverso para reconstruir el atributo HTML real.

**4. IIFE (función invocada inmediatamente) dentro de una expresión ternaria**
```js
const key = el.id
  ? `#${el.id}`
  : (() => { ... })();
```
Es una función anónima autoejecutada usada para poder tener lógica de varias líneas (`const [k, v] = ...`) **dentro** de una expresión ternaria, sin necesitar una función nombrada aparte. Buen ejemplo de "expression vs statement" en JS: un ternario necesita expresiones en sus dos ramas, y una IIFE convierte un bloque de statements en una expresión evaluable.

**5. `subscribe` + llamada inicial inmediata**
```js
const unsubscribe = store.subscribe(paint);
paint();
return unsubscribe;
```
Nota el orden: primero se suscribe, después se pinta manualmente una vez. Así `paint` corre tanto en el montaje inicial como en cada cambio futuro, con el mismo código — no hay una rama especial para "el primer render".

---

## 3. `routing.js` — Router SPA basado en `location.hash`

```js
export function route(pattern, view) {
  const rx = pattern
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    .replace(/\//g, '\\/');
  return { pattern: new RegExp(`^${rx}$`), view };
}

export function router(routes, outlet) {
  let currentDestroy = null;

  function resolve() {
    const hash = location.hash.slice(1) || '/';
    if (currentDestroy) { currentDestroy(); currentDestroy = null; }

    for (const { pattern, view } of routes) {
      const match = pattern.exec(hash);
      if (!match) continue;
      currentDestroy = view(outlet, match.groups ?? {}) ?? null;
      return;
    };

    outlet.innerHTML = '<p>404</p>';
  };

  window.addEventListener('hashchange', resolve);
  resolve();

  return {
    navigate: (path) => { location.hash = path; },
    current: () => location.hash.slice(1) || '/',
  };
};
```

### Conceptos de JS aplicados

**1. Construcción dinámica de regex con grupos con nombre**
```js
pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')
```
Convierte una ruta escrita como `/team/:id` en la string `/team/(?<id>[^/]+)`. `:(\w+)` captura el nombre del parámetro (`id`), y `$1` en el string de reemplazo lo reinyecta dentro de un **grupo de captura con nombre** `(?<id>...)` — una feature de regex de ES2018. Esto es lo que permite después leer `match.groups.id` en vez de tener que contar posiciones de grupos numerados (`match[1]`, `match[2]`...).

**2. Escapar `/` para que la regex sea válida**
```js
.replace(/\//g, '\\/')
```
Como el patrón final se compila con `new RegExp(...)`, cada `/` literal de la ruta debe escaparse a `\/` para no romper la sintaxis de la expresión regular resultante.

**3. `new RegExp(string)` construido en runtime**
A diferencia de un literal `/regex/`, acá la regex se arma a partir de un string en tiempo de ejecución — necesario porque el patrón depende del argumento `pattern` que recibe cada `route()`.

**4. Closures otra vez: `currentDestroy`**
`currentDestroy` vive en el closure de `router()`. Cada vez que cambia el hash, `resolve()` primero llama al `currentDestroy` de la vista anterior (si existía) — este es el mecanismo que garantiza que **cada feature limpia sus suscripciones y listeners antes de que la siguiente se monte**. Sin esto, navegar entre rutas acumularía listeners de todas las vistas visitadas.

**5. Cada `view` puede opcionalmente retornar una función de cleanup**
```js
currentDestroy = view(outlet, match.groups ?? {}) ?? null;
```
`view(...)` puede devolver `undefined` (si la vista no necesita limpieza) o una función. El `?? null` normaliza `undefined` a `null` para que el chequeo `if (currentDestroy)` de la siguiente vez sea simple y explícito.

**6. Sin match → 404 sin romper la app**
El `for...of` recorre las rutas en orden; si ninguna hace match, cae al `outlet.innerHTML = '<p>404</p>'` fuera del loop — nunca lanza una excepción no controlada por navegar a una ruta inexistente.

**7. `location.hash` como fuente de verdad del estado de navegación**
Se eligió hash routing (`#/dream-team`) en vez de History API (`pushState`) porque **no requiere configuración de servidor** para servir `index.html` en cualquier ruta — al ser una SPA vanilla servida con Vite sin backend propio, el hash evita 404s del servidor al refrescar en una ruta profunda.

---

## 4. `guards.js` — Higher-Order Functions para proteger rutas

```js
import { hasToken } from '@shared/http/auth.js';

export function createGuards(shell) {
  const withAuth = (view) => (outlet, params) => {
    if (!hasToken()) { location.hash = '/'; return; }
    shell.show();
    return view(outlet, params);
  };

  const withLogin = (view) => (outlet, params) => {
    if (hasToken()) { location.hash = '/dream-team'; return; }
    shell.hide();
    return view(outlet, params);
  };

  return { withAuth, withLogin };
}
```

### Conceptos de JS aplicados

**1. Higher-Order Functions (HOF) — funciones que devuelven funciones**
`withAuth` no es una vista, es una **función que envuelve una vista y devuelve una vista nueva** con la misma forma `(outlet, params) => cleanup`. Esto es el patrón "decorator" hecho con funciones puras de JS, sin clases ni herencia.

**2. Composición en el punto de uso**
```js
// splice.js
route('/dream-team', withAuth(renderDreamTeam)),
route('/',           withLogin(renderLogin)),
```
`routing.js` no sabe nada de autenticación — recibe una `view` normal. `withAuth(renderDreamTeam)` produce una función indistinguible de cualquier otra vista para el router. Este es el punto fuerte a explicar en la defensa: **separación de responsabilidades** — el router enruta, el guard decide si se puede entrar, la vista solo pinta.

**3. Cierre por `shell` capturado en closure**
`createGuards(shell)` recibe el shell (header/nav) una sola vez desde `splice.js`, y ambos guards lo usan sin necesidad de pasarlo de nuevo en cada llamada — otra vez, closures evitando pasar el mismo argumento por todos lados.

**4. Early return como guard clause**
```js
if (!hasToken()) { location.hash = '/'; return; }
```
Patrón de "guard clause": corta la ejecución temprano y evita anidar la lógica principal dentro de un `if/else`. Nota importante para la defensa: esto **cambia el hash**, lo cual dispara `hashchange` y por lo tanto una nueva llamada a `resolve()` en el router — es una redirección "manual" sin usar ningún método de recarga de página.

---

## 5. `escape.js` — Templating con Tagged Template Literals (y por qué no hay XSS)

```js
const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const raw = (str) => ({ __safe: true, value: str });

const escape = (v) => {
  if (v?.__safe) return v.value;
  if (Array.isArray(v)) return v.join('');
  return String(v).replace(/[&<>"']/g, c => ESCAPE_MAP[c]);
};

export function html(strings, ...values) {
  return strings.reduce((out, str, i) =>
    out + str + (values[i] !== undefined ? escape(values[i]) : ''), '');
};
```

Este es probablemente el archivo **más importante para defender**, porque conecta directamente con el requisito de "no introducir vulnerabilidades de seguridad" (OWASP — XSS).

### Conceptos de JS aplicados

**1. Tagged Template Literals — el feature central**
```js
html`<p>${userInput}</p>`
```
Cuando escribís una template string precedida por una función (`html\`...\``), JS no arma el string automáticamente: llama a `html(strings, ...values)` donde:
- `strings` es un **array** con los pedazos de texto literal (`['<p>', '</p>']`)
- `values` son los valores interpolados (`[userInput]`)

Esto le da control total a la función sobre cómo combinar texto literal y valores — es exactamente el mecanismo que usan librerías como `styled-components` o el propio `String.raw`.

**2. `reduce` para reconstruir el string, intercalando escape**
```js
strings.reduce((out, str, i) => out + str + (values[i] !== undefined ? escape(values[i]) : ''), '')
```
Recorre cada pedazo literal (`str`) y le suma **el valor correspondiente ya escapado** (`escape(values[i])`), excepto en el último pedazo donde no hay valor siguiente (`values[i]` es `undefined`). Este es el punto crítico de seguridad: **todo valor interpolado pasa obligatoriamente por `escape()` antes de llegar al HTML final** — no hay forma de olvidarse de escapar algo si usás `html\`\``, a diferencia de concatenar strings a mano.

**3. `escape()` — tabla de lookup + regex global**
```js
return String(v).replace(/[&<>"']/g, c => ESCAPE_MAP[c]);
```
`ESCAPE_MAP` es un objeto usado como **diccionario de reemplazo** de los 5 caracteres peligrosos en HTML. El regex `/[&<>"']/g` (con flag `g` = global, reemplaza *todas* las ocurrencias, no solo la primera) encuentra cada uno y `ESCAPE_MAP[c]` lo traduce a su entidad HTML. Esto es lo que impide que un input como `<script>alert(1)</script>` se interprete como HTML real: se convierte literalmente en el texto `&lt;script&gt;alert(1)&lt;/script&gt;`.

**4. `raw()` — el "escape hatch" controlado, y su riesgo**
```js
export const raw = (str) => ({ __safe: true, value: str });
```
A veces necesitás insertar HTML que **vos mismo generaste** (por ejemplo, el resultado de otro `html\`\`` anidado, o un bloque armado con clases de Tailwind) sin que se re-escape. `raw()` envuelve ese string en un objeto marcador `{ __safe: true, value }`. En `escape()`:
```js
if (v?.__safe) return v.value;
```
Si el valor tiene esa marca, se devuelve tal cual, sin pasar por el reemplazo de caracteres.

**Punto clave de seguridad que hay que poder explicar sin dudar**: `raw()` **nunca** debe envolver texto que venga directo de un usuario o de la API sin pasar antes por `html\`\`` (que ya escapa). En el código real, `raw()` se usa para: (a) HTML estático embebido en helpers (`raw(renderPanelHead(...))`), o (b) el resultado de otro `html\`\`` ya seguro. Nunca se usa `raw(userInput)` directamente en ningún archivo del proyecto — si te preguntan "¿dónde controlás que no se abuse de `raw`?", la respuesta es: por convención de uso, `raw()` solo envuelve salidas de funciones de render, nunca datos crudos de `state`.

**5. Soporte de arrays sin volver a escapar**
```js
if (Array.isArray(v)) return v.join('');
```
Permite patrones como:
```js
html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`
```
`items.map(...)` devuelve un array de strings — cada `html\`<li>${i}</li>\`` interno **ya escapó `i`** en su propia llamada. Si `escape()` tratara ese array como un valor cualquiera (`String(array)`), lo convertiría en texto separado por comas y encima re-escaparía el HTML válido que ya se generó. Por eso el chequeo `Array.isArray` va **antes** del chequeo genérico y simplemente concatena (`join('')`) sin tocar el contenido.

**6. `String(v)` como coerción explícita**
Antes de escapar, `escape` convierte el valor a string con `String(v)` — así funciona igual con números (`${score}`), booleanos, o cualquier tipo, sin errores si por ejemplo `v` es `0` o `undefined` (el `values[i] !== undefined` de más arriba ya filtra ese caso puntual, pero `null` sí llegaría a `String(null)` → `"null"`).

---

## 6. `delegate.js` — Event Delegation

```js
export function delegate(root, event, selector, handler) {
  const fn = (e) => {
    const target = e.target.closest(selector);
    if (target) handler(e, target);
  };
  root.addEventListener(event, fn);
  return () => root.removeEventListener(event, fn);
}
```

### Qué problema resuelve

`component.js` re-renderiza reemplazando `root.innerHTML` en cada cambio de estado. Si pusieras un listener directo en cada botón (`button.addEventListener('click', ...)`), **ese listener se perdería en cada re-render** porque el nodo DOM viejo (con su listener adjunto) es destruido y reemplazado por uno nuevo sin listeners. Habría que re-adjuntar listeners después de cada `paint()` — frágil y repetitivo.

### Conceptos de JS aplicados

**1. Event delegation (bubbling)**
En vez de escuchar en cada botón, se escucha **una sola vez** en `root` (un contenedor que persiste entre renders, ej. el `outlet` de toda la vista). Los eventos de click en los hijos **burbujean** (event bubbling) hasta `root`, así que un único listener alcanza para capturar clicks de elementos que ni siquiera existían cuando se registró el listener.

**2. `Element.closest(selector)`**
```js
const target = e.target.closest(selector);
```
`e.target` es el elemento exacto donde ocurrió el evento (podría ser un `<span>` dentro de un `<button>`). `.closest(selector)` sube por el árbol DOM (incluyendo el propio elemento) hasta encontrar el ancestro más cercano que matchee el selector CSS dado, o `null` si no hay ninguno. Esto resuelve el caso común de "el usuario clickeó el ícono dentro del botón, no el botón mismo" — sin `closest`, `e.target` sería el `<span>` y el `data-dt-add` (que está en el `<button>`) no se encontraría directamente.

**3. Guard clause + callback con dos argumentos**
```js
if (target) handler(e, target);
```
El `handler` recibe tanto el evento original (`e`) como el elemento que matcheó (`target`) — así el código que llama `delegate` puede leer `target.dataset.dtAdd` sin tener que repetir la lógica de `closest` en cada handler.

**4. Cleanup simétrico**
`return () => root.removeEventListener(event, fn)` — cada `delegate()` devuelve su propia función de desuscripción, igual que `store.subscribe`. En las vistas reales, todas estas funciones de cleanup se juntan en un array (`off = [delegate(...), delegate(...), ...]`) y se ejecutan todas en el retorno de la vista:
```js
return () => { state.destroy(); off.forEach(c => c()); };
```

---

## Ejemplo integrador real: `dream-team/view.js`

Para cerrar la defensa de Splice, conviene mostrar cómo los 6 archivos trabajan juntos en una sola feature:

```js
export function renderDreamTeam(outlet) {
  const state = store({ /* estado inicial */ });      // 1. store.js

  component(outlet, state, render);                    // 2. component.js — conecta estado ↔ DOM

  const off = [
    delegate(outlet, 'input', '#dt-search', (_, target) => {   // 3. delegate.js
      state.set({ search: target.value });                     //    dispara store.set
    }),
    delegate(outlet, 'click', '[data-dt-add]', (_, target) => {
      const id = target.dataset.dtAdd;
      state.update(s => {                                       // update evita stale closure
        if (s.selected.length >= 11 || s.selected.includes(id)) return {};
        return { selected: [...s.selected, id] };                // spread = inmutabilidad
      });
    }),
    // ...
  ];

  loadData(state);   // fetch async, ver client.js

  return () => { state.destroy(); off.forEach(c => c()); };   // cleanup total al cambiar de ruta
}
```

Y dentro de `render(state)` (que corre en cada `paint`):
```js
html`<span class="${w.teamName}">${team.name_en}</span>`   // escape.js — anti-XSS automático
```

Todo el ciclo: **usuario escribe → `delegate` captura el evento → `store.set` actualiza estado → `component` vuelve a llamar `render` → `escape.js` sanitiza cada interpolación → nuevo HTML pintado, con foco preservado por `snapshotFocus`.** Ese es el pitch de 30 segundos si te piden "explicá cómo funciona tu framework".

---

## Preguntas trampa típicas y respuestas cortas

- **"¿Por qué no usaste una clase para el store?"** → Closures dan la misma encapsulación sin `this`, sin `new`, y sin exponer campos que se puedan pisar por accidente.
- **"¿Qué pasa si dos componentes usan el mismo store?"** → Ambos se suscriben al mismo `Set` de subscribers; cualquier `set`/`update` desde cualquiera de los dos notifica a ambos por igual — es multi-consumidor por diseño.
- **"¿Por qué comparás con `===` y no con una comparación profunda (`deepEqual`)?"** → Por simplicidad y performance; a cambio, la disciplina del proyecto es *nunca mutar, siempre reemplazar* (spread), lo cual hace que `===` sea suficiente y barato.
- **"¿Por qué re-renderizás todo el HTML en vez de actualizar solo lo que cambió?"** → Trade-off consciente: sin virtual DOM el código es ínfimo y 100% explicable; a cambio se paga un poco de trabajo del navegador al re-parsear HTML, aceptable para el volumen de datos del proyecto (max ~104 partidos, 48 equipos).
- **"¿Cómo evitás que el input pierda el foco al tipear en el buscador?"** → `snapshotFocus` en `component.js`: guarda un selector CSS del elemento enfocado antes de repintar, y lo vuelve a enfocar (con su posición de cursor) después.
- **"¿Cómo se sabe que no hay XSS?"** → Todo el HTML pasa por la función `html\`\`` que escapa automáticamente cada interpolación con una tabla de reemplazo de caracteres peligrosos; `raw()` es la única forma de saltarse eso, y en el código nunca envuelve datos crudos del usuario o de la API — solo HTML ya generado por otro `html\`\``.
- **"¿Por qué hash routing y no History API?"** → No hay servidor propio sirviendo rutas — es una SPA estática con Vite; el hash nunca provoca un request nuevo al servidor al navegar ni al refrescar.
