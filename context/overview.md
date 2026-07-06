# Overview — Contexto del Repositorio

> Este documento existe para darle contexto a un LLM copiloto (Claude Code u otro) que trabaje en este repo. Es el punto de entrada: antes de tocar código, léelo junto con `approach.md`.

## 1. Qué es este proyecto

SPA de JavaScript vanilla (sin frameworks) construida con **Vite**, que consume la API REST pública del Mundial 2026 (`https://worldcup26.ir`). Es un laboratorio universitario individual, pero el diseño técnico se trata como un proyecto real: arquitectura limpia, estado sincronizado, y resiliencia real ante fallos de red/API — no un demo de "happy path".

**Los 5 subproyectos del catálogo son de entrega obligatoria** (confirmado por el profesor): Creador de "Dream Team", Buscador Cara a Cara, Seguidor de Sorpresas, Quiniela Local, y Simulador de Sorteo Loco. Se empieza implementando Dream Team (selección de 11 equipos + cálculo de goles) porque ya tiene el diseño más avanzado, pero el diseño de `core/` y `http/` debe pensarse desde el día uno para que las 5 vistas convivan en la misma SPA reutilizando la misma infraestructura base, sin duplicar lógica de estado o de fetch entre subproyectos.

Ver `approach.md` para el detalle funcional completo de cada subproyecto y los criterios de aceptación.

## 2. Stack técnico

- **Build tool**: Vite (sin plugin de framework — vanilla template).
- **Lenguaje**: JavaScript (ES modules), sin TypeScript salvo que se decida sumarlo después.
- **Sin dependencias de UI**: no React, no Vue, no jQuery. DOM manipulado a mano.
- **Persistencia**: `localStorage` (no hay backend propio ni base de datos — el único backend es la API pública del Mundial).
- **HTTP**: `fetch` nativo, exclusivamente con `async/await`.

## 3. Decisiones de arquitectura ya tomadas

Estas decisiones son intencionales y el copiloto no debería revertirlas sin que se le pida explícitamente:

1. **Micro-framework propio, no un framework externo.** El objetivo explícito del ejercicio (más allá del lab en sí) es construir una capa mínima de reactividad/componentes hecha a mano — no meter React/Preact/lit-html por atajo. Cualquier sugerencia de "mejor usa X librería" debe evaluarse contra este objetivo antes de aplicarse.
2. **Capa HTTP centralizada.** Un solo módulo debe envolver `fetch`: inyectar el JWT, manejar 401/429/500, aplicar backoff exponencial, y cachear/leer de `localStorage`. Ningún subproyecto debe reimplementar esta lógica por su cuenta.
3. **Polling en vez de push/websockets.** La API no soporta tiempo real, así que el "tiempo real" se simula con `setInterval` + comparación de snapshot anterior vs. nuevo. Esta infraestructura de polling se diseña como reusable desde el día uno, aunque el primer subproyecto (Dream Team) no la necesite directamente.
4. **Separación estricta fetch vs. presentación.** La lógica de red no debe vivir mezclada con el código que actualiza el DOM.

## 4. Restricciones no negociables (vienen del enunciado del laboratorio)

Estas reglas son evaluadas explícitamente en una defensa oral en vivo — el copiloto nunca debe generar código que las viole, incluso si simplifica algo:

- Cero `.then()` / `.catch()` en cualquier archivo, ni siquiera conviviendo con `async/await`.
- Cero `alert()`, en ningún punto del flujo, incluyendo manejo de errores.
- Cero `window.location.reload()` (ni equivalente) como solución a un error de sesión o de red.
- Cada request a un endpoint de datos debe llevar `Authorization: Bearer <token>`.
- 401 → limpiar token + modal "sesión expirada" con reautenticación, sin reload.
- 429 → countdown visible del siguiente reintento automático.
- 500 → backoff exponencial (ej. 1s, 2s, 4s, 8s).
- Última respuesta exitosa de cada endpoint se cachea en `localStorage`; si una petición falla y hay caché, se muestra con indicador de "datos no actualizados".

## 5. Cómo debe trabajar el copiloto en este repo

- Priorizar que el código sea **explicable por el estudiante en una defensa oral en vivo** — evitar patrones demasiado "mágicos" o abstracciones que el estudiante no pueda justificar con criterio propio.
- Antes de agregar una dependencia externa, preguntar si encaja con la filosofía "vanilla + micro-framework propio" del punto 3.
- Cualquier cambio que toque la capa HTTP debe seguir cumpliendo las 8 restricciones de la sección 4 sin excepción.
- Al implementar cada uno de los 5 subproyectos, reutilizar `core/` y `http/` en vez de duplicar lógica de estado o de fetch.