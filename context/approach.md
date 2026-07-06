# Approach — Simulador Mundial 2026 (Categoría C: Simuladores y Manejo de Estado)

## 1. De qué va el proyecto

Es una SPA (Single Page Application) construida en **JavaScript vanilla + Vite** — sin frameworks (React, Vue, etc.) — que consume la API REST pública del Mundial 2026 (`https://worldcup26.ir`). No es un ejercicio de maquetado: el foco real está en dos cosas:

1. **Manejo de estado en memoria y en `localStorage`**, sincronizado siempre con lo que se ve en el DOM (nunca debe desincronizarse el estado interno de lo que el usuario percibe).
2. **Resiliencia ante fallos de red y de la API** — el "happy path" (todo responde bien) vale poco en la nota; lo que realmente se evalúa es qué pasa cuando la API responde 401, 429 o 500.

La idea personal de fondo (fuera del scope estricto del lab, pero motivación real del proyecto) es aprovechar el ejercicio para armar un **micro-framework propio** para manejar componentes, eventos y estado de forma ágil, sin caer en un framework completo — algo tipo "mini reactive layer" hecho a mano sobre DOM vanilla.

## 2. Arquitectura base obligatoria (aplica a cualquier subproyecto elegido)

Estos 5 puntos son innegociables, sin importar cuál de los 5 subproyectos se implemente:

1. **Autenticación JWT**: token obtenido al autenticarse contra la API, enviado en cada request como `Authorization: Bearer <token>`. Ningún endpoint de datos puede omitirlo.
2. **`async/await` exclusivo**: toda llamada a `fetch` se resuelve con `async/await`. Cero `.then()` / `.catch()` en el código entregado, en ningún archivo.
3. **Manejo de 401 sin recargar la página**: si la API responde 401, se limpia el token guardado y se muestra un modal/pantalla de "sesión expirada" con opción de reautenticarse. Prohibido usar `window.location.reload()` o equivalente.
4. **Backoff exponencial para 500 y 429**: reintentos automáticos con espera creciente (ej. 1s, 2s, 4s, 8s). Para 429 específicamente, debe verse un **countdown visible** indicando cuándo ocurrirá el siguiente reintento.
5. **Modo offline con `localStorage`**: la última respuesta exitosa de cada endpoint se cachea. Si una petición nueva falla y existe copia cacheada, se muestran esos datos con un indicador visible de "datos no actualizados".

### Prohibiciones absolutas (reprueban el proyecto si aparecen)
- `alert()` en cualquier punto, incluyendo manejo de errores.
- `.then()` / `.catch()`, aunque convivan con `async/await` en otra parte del mismo archivo.
- `window.location.reload()` (o equivalente) como solución a un error de sesión o de red.

## 3. Los 5 subproyectos (todos obligatorios)

> El profesor confirmó que los 5 subproyectos de la Categoría C son de entrega obligatoria, no una elección única. El orden de implementación sigue siendo flexible — se empieza por Dream Team porque ya tiene el diseño más avanzado — pero los 5 deben quedar funcionales al final.

### 3.1 Creador de "Dream Team" (primero en implementarse)

**Objetivo técnico**: manejo de estado en memoria con actualización en tiempo real ante cada cambio de selección.

**Endpoints**: `GET /get/teams`, `GET /get/games`.

**Funcionalidades exigidas**:
- Seleccionar exactamente **11 equipos distintos** de una lista buscable poblada desde `/get/teams`.
- Bloquear nuevas selecciones al llegar a 11, con mensaje visual en la propia lista (nunca `alert()`).
- Por cada equipo agregado, calcular sus goles a favor: sumar `home_score` cuando es local y `away_score` cuando es visitante, **solo** en partidos con `finished: true`.
- Mostrar y actualizar un **total general de goles** del Dream Team cada vez que se agrega o quita un equipo.

**Reto de resiliencia específico**: si falla la petición para calcular los goles de un equipo recién agregado, ese equipo permanece en la lista con indicador de "goles pendientes de calcular". El total general debe excluir ese valor pendiente **sin producir `NaN`** en la suma.

### 3.2 Buscador Cara a Cara
**Objetivo técnico**: debounce para autocompletado + `Promise.all` para peticiones paralelas con manejo de fallos independientes.
**Endpoints**: `GET /get/team/?name=`, `GET /get/games`, `GET /get/groups`.
**Funcionalidades**:
- Dos campos de búsqueda con debounce (300–500 ms) contra `/get/team/?name=`.
- Al confirmar ambos equipos, usar `Promise.all` para traer en paralelo sus datos y su grupo (`/get/groups`).
- Comparativa lado a lado: bandera, grupo y puntos de cada equipo.
- Si comparten grupo, filtrar de `/get/games` el partido entre ellos y mostrarlo.
**Reto de resiliencia**: si una de las dos promesas de `Promise.all` falla y la otra resuelve bien, se muestra la columna que sí cargó completa, y la afectada muestra error local. Nunca se descartan ambos resultados por el fallo de uno solo.

### 3.3 Seguidor de Sorpresas
**Objetivo técnico**: polling periódico con detección de cambios de estado y alertas visuales no bloqueantes.
**Endpoints**: `GET /get/games`, `GET /get/teams`.
**Funcionalidades**:
- Marcar uno o varios equipos como "favoritos", guardados en `localStorage`.
- Polling periódico sobre `/get/games` con intervalo configurable.
- Detectar si el partido más reciente de un favorito lo muestra perdiendo (marcador menor al del rival).
- Alerta visual no bloqueante (banner/badge en el DOM, nunca `alert()`) que cambie de color o parpadee mientras la condición se mantenga.
**Reto de resiliencia**: si un ciclo de polling falla, se conserva el último marcador conocido (memoria o `localStorage`) y se reintenta en el siguiente ciclo. La alerta activa no se apaga ni el marcador se resetea a "0-0" por una falla temporal de red.

### 3.4 Quiniela Local
**Objetivo técnico**: persistencia local de datos del usuario y comparación posterior contra datos remotos.
**Endpoints**: `GET /get/games`, `GET /get/teams`.
**Funcionalidades**:
- Ingresar predicción de marcador para partidos con `finished: false`, guardada en `localStorage` indexada por id del partido.
- Cuando un partido pase a `finished: true`, comparar automáticamente la predicción contra el resultado real.
- Mostrar el puntaje: marcador exacto, solo resultado correcto (ganador/empate), o fallo.
**Reto de resiliencia**: las predicciones guardadas deben leerse primero de `localStorage` y mostrarse de inmediato al abrir la página, incluso si la API está caída. La comparación contra el resultado real se actualiza solo cuando la petición de partidos finalmente responde.

### 3.5 Simulador de Sorteo Loco
**Objetivo técnico**: implementación correcta del algoritmo Fisher-Yates y separación entre datos de origen y estado derivado.
**Endpoints**: `GET /get/teams`.
**Funcionalidades**:
- Obtener los 48 equipos reales de `/get/teams`.
- Aplicar Fisher-Yates para mezclarlos aleatoriamente.
- Repartirlos en 12 grupos ficticios de 4 equipos, distintos de los grupos oficiales A-L.
- Botón "Repetir sorteo" que vuelve a mezclar el arreglo ya obtenido, **sin volver a pedirlo a la API**.
**Reto de resiliencia**: el sorteo se guarda en `localStorage`. Si el usuario refresca antes de pedir un nuevo sorteo, debe ver el mismo sorteo anterior en vez de un estado vacío. `/get/teams` solo se llama una vez por sesión, salvo recarga forzada explícita.

## 4. Criterios de aceptación (derivados de la rúbrica)

Cada uno de los 5 subproyectos se considera correctamente resuelto cuando:

- [ ] Todas las funcionalidades exigidas de ese subproyecto están implementadas y el estado (memoria/`localStorage`) siempre coincide con lo mostrado en el DOM.
- [ ] Todas las llamadas a la API usan `async/await`, sin ningún `.then()/.catch()` en el código; la lógica de `fetch` está separada de la lógica de presentación; cada llamada incluye `Authorization: Bearer <token>`.
- [ ] Un 401 limpia el token y muestra pantalla/modal de sesión expirada con opción de reautenticarse (sin `reload()`); un 429 muestra countdown visible del siguiente reintento.
- [ ] Un 500 dispara backoff exponencial automático; si hay copia cacheada en `localStorage`, se muestra con indicador de "no actualizado"; el reto de resiliencia específico de ese subproyecto queda resuelto (ej. en Dream Team: nunca se produce `NaN` en el total si un equipo tiene goles pendientes).
- [ ] Cero `alert()`, cero mezcla `.then()/.catch()` con `async/await`, cero `window.location.reload()` como solución de error de sesión o red.
- [ ] El código es explicable línea por línea por el estudiante, incluyendo cualquier parte generada con apoyo de IA — se debe poder justificar cada decisión de diseño en una defensa oral en vivo, incluyendo reproducir en DevTools (Console y Network) un error 401/429/500 sin que la app se rompa visualmente.

El proyecto completo (los 5) se considera entregado cuando los 5 subproyectos cumplen su checklist individual, y las 5 vistas conviven en la misma SPA sin duplicar lógica de estado/HTTP entre sí (ver sección 6 y `tooling.md` para el diseño del router y el micro-framework compartido).

## 5. Notas de arquitectura / diseño técnico a definir

Cosas a decidir antes de empezar a codear el Dream Team Creator:

- **Micro-framework propio**: vale la pena definir un layer mínimo de "componente" (render function + estado local + suscripción a cambios) antes de escribir la primera feature, para no terminar escribiendo DOM manipulation espagueti. Esto se puede diseñar de forma incremental: empezar simple (manejo de estado global + re-render manual) e ir agregando reactividad conforme se necesite.
- **Polling simulado**: dado que la API real no soporta websockets/push, el "tiempo real" se simula con `setInterval` + comparación de snapshot anterior vs nuevo para detectar cambios (relevante sobre todo para Seguidor de Sorpresas, pero la infraestructura de polling se puede diseñar de forma reusable desde ya).
- **Capa de HTTP centralizada**: un solo módulo que envuelva `fetch`, inyecte el JWT, maneje 401/429/500 y backoff, y cachee en `localStorage` — para que los 5 subproyectos (si se llega a implementar más de uno) reutilicen la misma infraestructura de resiliencia sin duplicar código.