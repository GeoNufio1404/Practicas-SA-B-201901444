# ---- builder: instala dependencias en un venv ----
FROM python:3.12-alpine AS builder
RUN apk add --no-cache gcc musl-dev libffi-dev
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt

# ---- final: runtime minimo (alpine), usuario no-root ----
FROM python:3.12-alpine AS final
RUN adduser -u 10001 -S -D -s /sbin/nologin app
COPY --from=builder /venv /venv
WORKDIR /app
COPY --chown=10001:10001 app ./app
ENV PATH="/venv/bin:$PATH"
USER 10001
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
