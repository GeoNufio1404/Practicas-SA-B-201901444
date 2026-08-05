# Guía de arranque — Base del proyecto (Fase 0-1)

Esto NO es el README final de entrega (ese va con SOLID, diagramas, etc. — lo armamos
al final). Esto es solo para que puedas levantar y probar la base.

## 1. Base de datos

1. Abre tu cliente MySQL y ejecuta el script:
   ```
   backend/db/schema.sql
   ```
   Esto crea la base `practica2_auth` y la tabla `usuarios`.

## 2. Backend principal

```bash
cd backend
npm install
cp .env.example .env
```

Edita `.env` y coloca:
- Tus credenciales reales de MySQL (`DB_USER`, `DB_PASSWORD`).
- Un `JWT_SECRET` real (genera uno con el comando que está comentado en `.env.example`).
- Un `AES_SECRET_KEY` real de 32 bytes en hex (mismo lugar, otro comando de ejemplo).

Levanta el servidor:
```bash
npm run dev
```

Prueba que todo esté conectado:
```
GET http://localhost:4000/health
```
Debe responder `{ "server": "ok", "database": "ok" }`. Si `database` dice `fail`,
revisa las credenciales en `.env` o que MySQL esté corriendo.

## 3. Microservicio de autorización

```bash
cd auth-service
npm install
cp .env.example .env
npm run dev
```

Prueba:
```
GET http://localhost:5000/health
```
Debe responder `{ "status": "ok" }`.

## 4. Frontend

Aún no está creado — lo armamos en la Fase 5. Si quieres adelantar el
scaffold con Create React App, dime y lo generamos.

---

## ¿Qué ya está listo de la Fase 0-1?

- [x] Estructura de carpetas (`backend`, `auth-service`, `frontend`)
- [x] Esquema de base de datos (`usuarios` con campos encriptados)
- [x] Variables de entorno definidas (JWT, AES, retry/backoff, DB)
- [x] Utilidad de encriptación AES-256-GCM (`src/utils/aes.js`) — ya lista para usarse en el registro
- [x] Conexión a MySQL probada vía `/health`
- [x] Microservicio de autorización con esqueleto propio y su propio `package.json`

## Siguiente paso (Fase 2)

Construir `POST /register` y `POST /login` en el backend, usando `aes.js` para
nombre/correo y `bcrypt` para la contraseña, y emitiendo el JWT en cookie HTTP-only.
