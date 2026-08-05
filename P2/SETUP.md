# Guía de arranque — Práctica 2

Esto NO es el README final de entrega (ese va con SOLID, diagramas, etc. — lo armamos
al final). Esto es la guía operativa: cómo levantar todo, conectarte a MySQL y probar
los endpoints que ya existen.

El proyecto corre dockerizado con `podman-compose` (4 servicios: `mysql`, `backend`,
`auth-service`, `frontend`).

---

## 1. Levantar todo el proyecto

Desde la raíz `P2/` (donde está `docker-compose.yml`):

```bash
podman-compose up -d
```

Verifica que los 4 contenedores estén arriba y `healthy`:

```bash
podman ps
```

Deberías ver `p2-mysql`, `p2-backend`, `p2-auth-service`, `p2-frontend` corriendo, con
puertos `3306`, `4000`, `5000`, `3000` respectivamente.

### Reiniciar un solo servicio (por cambios de código)

```bash
podman-compose build <servicio> --no-cache
podman-compose up -d --force-recreate <servicio>
```

`<servicio>` es `backend`, `auth-service` o `frontend`.

**Importante:** cambiar `.env` NO alcanza con un `restart` normal, porque las
variables de entorno se inyectan al crear el contenedor. Usa siempre
`--force-recreate` después de tocar un `.env`:

```bash
podman-compose up -d --force-recreate backend
```

Para confirmar qué variables tiene el contenedor realmente cargadas:

```bash
podman exec p2-backend printenv NOMBRE_DE_LA_VARIABLE
```

### Ver logs

```bash
podman logs p2-backend --tail 30
podman logs p2-auth-service --tail 30
podman logs p2-mysql --tail 30
```

Revisa logs siempre que un endpoint te devuelva `{"error":"Error interno..."}` — el
detalle real del error (stack trace) sale ahí, no en la respuesta del curl.

---

## 2. Conectarte a MySQL

El schema (`backend/db/schema.sql`) se ejecuta automáticamente la **primera vez**
que se crea el volumen de datos de MySQL (vía `/docker-entrypoint-initdb.d/`). No
hace falta correrlo a mano salvo que borres el volumen y quieras reinicializar.

Para entrar al cliente MySQL dentro del contenedor:

```bash
podman exec -it p2-mysql mysql -u root
```

(Según tus logs, `root@localhost` se crea sin password en este setup. Si definiste
`MYSQL_ROOT_PASSWORD` en el `docker-compose.yml`, usa `mysql -u root -p` y escribe
esa contraseña.)

Comandos útiles una vez dentro:

```sql
USE practica2_auth;
SHOW TABLES;
DESCRIBE usuarios;

-- Ver usuarios registrados (nombre/correo salen encriptados, es lo esperado)
SELECT id, correo_hash, rol, created_at FROM usuarios;
SELECT nombre_enc, correo_enc FROM usuarios WHERE id = 1;
```

Si `nombre_enc`/`correo_enc` se ven como texto ilegible tipo `a1b2c3:...:...`
(formato `iv:authTag:cipherText` en hex), la encriptación AES está funcionando
correctamente. Si algún día quieres reinicializar la base desde cero:

```bash
podman-compose down -v   # -v borra también el volumen de datos
podman-compose up -d
```

---

## 3. Probar los endpoints de autenticación

Todos los ejemplos usan `curl`. El flag `-c cookies.txt` guarda la cookie que
manda el backend; `-b cookies.txt` la reenvía, simulando lo que haría el navegador
automáticamente.

### Registro

```bash
curl -X POST localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Nufio","correo":"nufio@test.com","password":"1234","rol":"admin"}'
```

Respuesta esperada (201):
```json
{"id":1,"nombre":"Nufio","correo":"nufio@test.com","rol":"admin"}
```

`rol` puede ser `"admin"` o `"cliente"`; si se omite, por defecto es `"cliente"`.

### Login

```bash
curl -c cookies.txt -X POST localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"nufio@test.com","password":"1234"}'
```

Respuesta esperada (200) + cookie `jwt` guardada en `cookies.txt` (HTTP-only, no
visible desde JavaScript en el navegador):
```json
{"id":1,"nombre":"Nufio","correo":"nufio@test.com","rol":"admin"}
```

Credenciales incorrectas → 401 `{"error":"Credenciales inválidas."}` (mensaje
genérico a propósito, no revela si el correo existe).

### Ruta protegida (requiere estar logueado)

```bash
curl -b cookies.txt localhost:4000/api/auth/me
```

Devuelve el usuario asociado al JWT de la cookie. Sin cookie → 401
`{"error":"No autenticado. Falta el token."}`.

### Logout

```bash
curl -c cookies.txt -b cookies.txt -X POST localhost:4000/api/auth/logout
```

Limpia la cookie `jwt`. Después de esto, `/api/auth/me` con esa misma cookie
debe volver a dar 401.

### Health checks

```bash
curl localhost:4000/health        # {"server":"ok","database":"ok"}
curl localhost:5000/health        # {"status":"ok"}
```

---

## 4. Frontend

Levantado con Vite en `http://localhost:3000` (dentro del contenedor `p2-frontend`).
Aún sin lógica de login conectada al backend — eso es la Fase 5.

---

## Estado actual del proyecto

- [x] **Fase 0-1:** estructura, esquema de BD, variables de entorno, AES listo
- [x] **Fase 2:** registro, login, logout, `/me` protegida, JWT en cookie HTTP-only,
      renovación automática del JWT dentro de la ventana de gracia
- [x] Todo dockerizado con Podman Compose (mysql, backend, auth-service, frontend)
- [ ] **Fase 3:** microservicio de autorización real (`/authorize`) + retry loop con
      backoff desde el backend principal
- [ ] **Fase 4:** rutas protegidas por rol (Ruta 1 solo Admin, Ruta 2 Admin+Cliente)
- [ ] **Fase 5:** frontend conectado (registro, login, página de confirmación)
- [ ] **Fase 6:** README final de entrega (SOLID, diagrama de secuencia, tecnologías)
- [ ] **Fase 7:** checklist de entrega en UEDI

## Siguiente paso (Fase 3)

Implementar la lógica real de `POST /authorize` en `auth-service`, y en el backend
principal el cliente HTTP que lo consulta con reintentos configurables y backoff
antes de denegar acceso por error de comunicación.