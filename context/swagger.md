# API Manual — World Cup 2026 API (worldcup26.ir)

> Manual de consumo para la API pública del Mundial 2026. Fuente: [Swagger UI](https://worldcup26.ir/api-docs/) y el [repo open-source](https://github.com/rezarahiminia/worldcup2026) del proyecto (Express.js + MongoDB + JWT).

## 1. Lo esencial en 30 segundos

- **Base URL**: `https://worldcup26.ir`
- **Auth**: JWT. Te registrás o hacés login, te dan un `token`, y lo mandás en cada request como `Authorization: Bearer <token>`.
- **Formato**: JSON, REST estándar.
- **Duración del token**: **84 días**. No hay refresh token — cuando expira, se vuelve a hacer login.
- **Rate limit en endpoints públicos (`/get/*`)**: 120 requests/minuto por IP (default). Pasado ese límite → `429`.
- **Cache interno del servidor**: respuestas de `/get/*` se cachean 30s server-side — no afecta tu lógica de cliente, pero explica por qué a veces ves datos "viejos" por unos segundos incluso sin fallar nada.

## 2. Autenticación

### Registro

```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "your_secure_password"
}
```

**Respuesta 200:**
```json
{
  "user": { "_id": "...", "name": "John Doe", "email": "john@example.com", "createdAt": "..." },
  "token": "eyJhbGciOi..."
}
```

**Errores:** `400` "User already exists" · `400` "Registration failed"

### Login

```
POST /auth/authenticate
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "your_password"
}
```

**Respuesta 200:** mismo shape que el registro (`user` + `token`).

**Errores:** `400` "User not found" · `400` "Invalid password"

### Uso del token

Todos los endpoints de datos (`/get/*`) requieren el header en **cada** request:

```
Authorization: Bearer <token>
```

```js
await fetch('https://worldcup26.ir/get/teams', {
  headers: { Authorization: `Bearer ${token}` }
});
```

No hay endpoint de logout ni de refresh — la app solo necesita decidir qué hacer cuando el server responde `401` (token inválido/expirado): limpiar el token guardado y pedir login de nuevo.

## 3. Endpoints de datos

Todos requieren JWT salvo `/health`.

### Equipos

| Endpoint | Descripción |
|---|---|
| `GET /get/teams` | Los 48 equipos clasificados. |
| `GET /get/team/{teamId}` | Un equipo por id. |
| `GET /get/team/?name={teamName}` | Búsqueda por nombre (inglés o persa). |
| `GET /get/teams/?group={groupName}` | Equipos de un grupo (`A`–`L`). |

**Shape de un equipo:**
```json
{
  "id": "37",
  "name_en": "Argentina",
  "name_fa": "آرژانتین",
  "fifa_code": "ARG",
  "groups": "J",
  "flag": "https://..."
}
```

### Grupos

| Endpoint | Descripción |
|---|---|
| `GET /get/groups` | Las 12 tablas de posiciones (`A`–`L`). |
| `GET /get/group/{groupId}` | Un grupo por id. |
| `GET /get/group/?name={groupName}` | Un grupo por letra. |

**Shape de un grupo:**
```json
{
  "group": "G",
  "teams": [
    { "team_id": "25", "pts": "0", "gf": "0", "ga": "0" },
    { "team_id": "26", "pts": "0", "gf": "0", "ga": "0" }
  ]
}
```

### Partidos

| Endpoint | Descripción |
|---|---|
| `GET /get/games` | Los 104 partidos del torneo. |
| `GET /get/game/{matchId}` | Un partido por id (`1`–`104`). |

**Shape de un partido (fase de grupos):**
```json
{
  "id": "1",
  "home_team_id": "1",
  "away_team_id": "2",
  "home_score": "0",
  "away_score": "0",
  "home_scorers": "null",
  "away_scorers": "null",
  "group": "A",
  "matchday": "1",
  "local_date": "06/11/2026 13:00",
  "stadium_id": "1",
  "finished": "FALSE",
  "time_elapsed": "notstarted",
  "type": "group",
  "home_team_name_en": "Mexico",
  "away_team_name_en": "South Africa"
}
```

**Shape de un partido de knockout con equipos aún no definidos** (usa `home_team_label` / `away_team_label` en vez de nombres reales, e `id`s `"0"`):
```json
{
  "id": "73",
  "home_team_id": "0",
  "away_team_id": "0",
  "group": "R32",
  "type": "r32",
  "home_team_label": "Runner-up Group A",
  "away_team_label": "Runner-up Group B"
}
```

**Etapas del torneo (campo `type`):**

| `type` | `group` | Etapa | Partidos | IDs |
|---|---|---|---|---|
| `group` | A–L | Fase de grupos | 72 | 1–72 |
| `r32` | R32 | Dieciseisavos | 16 | 73–88 |
| `r16` | R16 | Octavos | 8 | 89–96 |
| `qf` | QF | Cuartos | 4 | 97–100 |
| `sf` | SF | Semifinal | 2 | 101–102 |
| `third` | 3RD | Tercer lugar | 1 | 103 |
| `final` | FINAL | Final | 1 | 104 |

### Estadios

| Endpoint | Descripción |
|---|---|
| `GET /get/stadiums` | Los 16 estadios sede. |

**Shape:**
```json
{
  "id": "11",
  "name_en": "MetLife Stadium",
  "fifa_name": "New York/New Jersey Stadium",
  "city_en": "East Rutherford, NJ",
  "country_en": "United States",
  "capacity": 82500
}
```

### Health check (sin auth)

`GET /health` (o `GET /api/health`) — no requiere token, útil para un chequeo rápido de "¿está viva la API?" antes de intentar autenticar.

## 4. Códigos de respuesta

| Código | Significado |
|---|---|
| `200` | Éxito |
| `400` | Bad Request — parámetros inválidos |
| `401` | Unauthorized — token inválido, ausente o expirado |
| `404` | Recurso no encontrado |
| `429` | Rate limit excedido |
| `500` | Error interno del servidor |

## 5. Rate limiting (relevante para el backoff/countdown del lab)

La API real corre con estos defaults (pueden variar si el profesor/instancia los cambia, pero son el comportamiento esperado):

| Config | Default | Qué significa |
|---|---|---|
| Rate limit general (no-`/get/*`) | 500 req / 60s por IP | Aplica a `/auth/*`. |
| Rate limit público (`/get/*`) | 120 req / 60s por IP | Este es el que más vas a golpear con polling agresivo. |
| Cache server-side de `/get/*` | 30s TTL | La API te puede devolver una respuesta cacheada de hasta 30s de antigüedad aun en un 200 exitoso — no confundir con tu propio "modo offline" en `localStorage`. |

**Implicación práctica:** si tu polling es muy frecuente (ej. cada 2-3s) sobre `/get/games` para el Seguidor de Sorpresas, vas a pisar el límite de 120/60s bastante rápido con solo un par de pestañas abiertas. Ajustar el intervalo de polling pensando en este límite, no solo en la UX.

## 6. Gotchas importantes (leer antes de codear)

Estas son cosas del shape real de la API que difieren de lo que uno asumiría a simple vista, y que van a afectar directamente tu lógica de estado:

1. **`finished` es un string, no un boolean.** La API devuelve `"finished": "FALSE"` o `"finished": "TRUE"` (string, mayúsculas), **no** `true`/`false` booleano. Si comparás con `game.finished === true` nunca va a matchear — hay que comparar con `game.finished === "TRUE"` o normalizarlo al leer la respuesta.
2. **Los números vienen como strings.** `home_score`, `away_score`, `pts`, `gf`, `ga`, `capacity` (este último sí es number) — la mayoría de campos numéricos de partidos y grupos llegan como string (`"0"` en vez de `0`). Hay que `parseInt`/`Number(...)` antes de sumar, o vas a terminar concatenando strings en vez de sumar goles.
3. **Partidos de knockout sin equipos definidos usan `"0"` como id y agregan `home_team_label`/`away_team_label`.** Si tu código asume que siempre hay `home_team_name_en`/`away_team_name_en`, va a romper en esos partidos hasta que el bracket se defina.
4. **No hay endpoint de refresh de token.** Un 401 siempre implica volver a loguear manualmente — no hay nada que "renovar" automáticamente en segundo plano.
5. **El límite de 120 req/min es por IP, no por usuario/token.** Si estás probando con varias pestañas o varios compañeros de equipo comparten red (ej. en la universidad), el 429 puede aparecer más rápido de lo que esperarías con tu propio uso individual — bueno tenerlo en cuenta al probar el backoff/countdown en vivo para la defensa.

## 7. Referencias

- [Swagger UI interactivo](https://worldcup26.ir/api-docs/)
- [Repo del proyecto (open-source)](https://github.com/rezarahiminia/worldcup2026)