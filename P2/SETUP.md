# Guía de arranque — Práctica 2

Esta es la guía OPERATIVA (cómo levantar todo, conectarte a MySQL, probar
endpoints). El documento de entrega con SOLID, diagrama de secuencia y
explicación de tecnologías es `README.md`, en la raíz del repo.

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

Levantado con Vite en `http://localhost:3000`. Registro, login y página de
confirmación (`/panel`) ya conectados al backend, incluyendo demo en vivo de
Ruta 1 / Ruta 2.

---
