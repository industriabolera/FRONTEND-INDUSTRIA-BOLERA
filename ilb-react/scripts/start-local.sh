#!/usr/bin/env bash
# =============================================================================
# start-local.sh — Arranque local completo de Industria Bolera (ilb-react)
#
# Orquesta en un solo terminal, con aislamiento FAIL-CLOSED respecto de los
# servicios productivos:
#   1. MongoDB local exclusivo (docker-compose.mongo.local.yml)
#   2. MariaDB local                  (npm run contact:db:up)
#   3. Backend Express con .env.contact.local (npm run contact:dev:server)
#   4. Frontend Vite                  (npm run dev)
#
# Aislamiento impuesto por este launcher:
#   - Exige un daemon Docker LOCAL: rechaza contextos ssh://, tcp:// o cualquier
#     endpoint remoto antes de crear un contenedor.
#   - Fuerza MONGODB_URI a mongodb://127.0.0.1:27017/administracion anulando
#     cualquier valor heredado del shell o de .env.contact.local. Nunca Atlas.
#   - Fuerza CONTACT_DB_TARGET=local con MariaDB loopback en 127.0.0.1:3307
#     usando el compose/scripts existentes.
#   - Vacía RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, PLACETOPAY_LOGIN
#     y PLACETOPAY_TRANKEY. El bloqueo real es fail-closed: con credenciales
#     vacías los envíos y los pagos fallan antes de abrir conexiones de red.
#     PLACETOPAY_ENV=sandbox es solo un selector NO productivo.
#   - No modifica .env.contact.local ni imprime secretos.
#
# El MongoDB local arranca VACÍO: el backend crea colecciones, índices y la
# configuración por defecto de forma perezosa. No hay seed ni datos productivos.
#
# Reutiliza únicamente servicios que puede identificar como propios:
#   - MongoDB por etiquetas Compose del proyecto ilb-local-mongo.
#   - Backend solo si fue iniciado por un `start-local.sh` (cadena de PPIDs).
#     Un backend ajeno en 3001 ABORTA el arranque: no se puede probar que use el
#     Mongo local ni que tenga las integraciones externas bloqueadas.
#   - Frontend por healthcheck (no maneja secretos ni integraciones externas).
#
# Al recibir Ctrl-C detiene únicamente los procesos creados por este script y
# conserva contenedores y volúmenes. Nunca detiene procesos preexistentes.
#
# Uso:  scripts/start-local.sh   (o el alias `ilb-local`)
# =============================================================================
set -Eeuo pipefail

# --- Rutas resueltas de forma independiente del directorio de invocación -----
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
ENV_FILE="$PROJECT_DIR/.env.contact.local"

# --- Configuración -----------------------------------------------------------
BACKEND_HEALTH_URLS=("http://localhost:3001/api/health" "http://127.0.0.1:3001/api/health")
FRONTEND_HEALTH_URLS=("http://localhost:5173/" "http://[::1]:5173/")
DB_READY_TIMEOUT="${ILB_DB_TIMEOUT:-90}"
MONGO_READY_TIMEOUT="${ILB_MONGO_TIMEOUT:-120}"
BACKEND_READY_TIMEOUT="${ILB_BACKEND_TIMEOUT:-60}"
FRONTEND_READY_TIMEOUT="${ILB_FRONTEND_TIMEOUT:-90}"
DB_POLL_INTERVAL=2
HTTP_POLL_INTERVAL=1

# --- Mongo local exclusivo ----------------------------------------------------
MONGO_COMPOSE_FILE="$PROJECT_DIR/docker-compose.mongo.local.yml"
MONGO_PROJECT="ilb-local-mongo"
MONGO_SERVICE="mongodb-local"
MONGO_VOLUME="ilb_local_mongodb_data"
MONGO_HOST="127.0.0.1"
MONGO_PORT="27017"
MONGO_DB="administracion"
# URI local forzada en TODO el proceso launcher. Sin credenciales ni TLS.
LOCAL_MONGODB_URI="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
RESOLVED_MONGO_CONTAINER=""

# MariaDB local forzada (compose existente docker-compose.contact.local.yml).
CONTACT_DB_PORT="3307"

# PIDs de procesos iniciados por este script (nunca de servicios reutilizados).
STARTED_PIDS=()
HAS_SETSID=0
if command -v setsid >/dev/null 2>&1; then
  HAS_SETSID=1
fi

# --- Mensajes ----------------------------------------------------------------
info() { printf '==> %s\n' "$*"; }
warn() { printf 'AVISO: %s\n' "$*" >&2; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Prefija cada línea de un servicio para que los logs sean legibles.
log_prefix() {
  local prefix="$1" line
  while IFS= read -r line || [[ -n "$line" ]]; do
    printf '%s %s\n' "$prefix" "$line"
  done
}

# --- HTTP --------------------------------------------------------------------
http_status() {
  local url="$1" code
  code="$(curl -s -o /dev/null -m 4 -w '%{http_code}' "$url" 2>/dev/null)" || true
  [[ -n "$code" ]] || code="000"
  printf '%s' "$code"
}

any_http_200() {
  local url status
  for url in "$@"; do
    status="$(http_status "$url")"
    if [[ "$status" == "200" ]]; then
      return 0
    fi
  done
  return 1
}

# --- Docker local ------------------------------------------------------------
# Endpoint efectivo del daemon: DOCKER_HOST tiene prioridad sobre el contexto.
effective_docker_endpoint() {
  if [[ -n "${DOCKER_HOST:-}" ]]; then
    printf '%s' "$DOCKER_HOST"
    return 0
  fi
  local ctx
  ctx="$(docker context show 2>/dev/null || true)"
  [[ -n "$ctx" ]] || return 0
  docker context inspect "$ctx" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true
}

# Rechaza cualquier daemon remoto (ssh://, tcp://, http(s)://) antes de tocar
# contenedores. El endpoint nunca se imprime para no exponer credenciales.
ensure_local_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker no está disponible en PATH."
  if ! docker compose version >/dev/null 2>&1; then
    fail "docker compose (v2) no está disponible."
  fi

  local endpoint
  endpoint="$(effective_docker_endpoint)"
  case "$endpoint" in
    ssh://*|tcp://*|http://*|https://*)
      fail "Contexto Docker REMOTO detectado. ilb-local exige un daemon local; no se arranca ningún contenedor."
      ;;
    unix://*|npipe://*|"")
      : ;;
    *)
      fail "Endpoint Docker no reconocido como local. ilb-local exige un daemon local; no se arranca ningún contenedor."
      ;;
  esac

  if ! docker info >/dev/null 2>&1; then
    fail "No se puede contactar el daemon Docker local. Arráncalo y vuelve a intentarlo."
  fi
  info "Daemon Docker local verificado."
}

mongo_compose() {
  docker compose -p "$MONGO_PROJECT" -f "$MONGO_COMPOSE_FILE" "$@"
}

# Nombre del contenedor del proyecto Compose local (identidad por etiquetas).
mongo_container_name() {
  local names
  names="$(docker ps --filter "label=com.docker.compose.project=$MONGO_PROJECT" \
                     --filter "label=com.docker.compose.service=$MONGO_SERVICE" \
                     --format '{{.Names}}' 2>/dev/null || true)"
  printf '%s' "${names%%$'\n'*}"
}

# ¿Hay algo escuchando en el puerto TCP indicado? (solo comprobación local)
port_in_use() {
  local port="$1" out=""
  if command -v ss >/dev/null 2>&1; then
    out="$(ss -H -ltn "sport = :$port" 2>/dev/null || true)"
    [[ -n "$out" ]]
    return
  fi
  (exec 3<>"/dev/tcp/${MONGO_HOST}/$port") >/dev/null 2>&1
}

# PID del proceso que escucha en un puerto TCP local (si es visible).
listener_pid() {
  local port="$1" pid
  if command -v ss >/dev/null 2>&1; then
    pid="$(ss -ltnpH "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | head -n1 | cut -d= -f2 || true)"
    if [[ -n "$pid" ]]; then
      printf '%s' "$pid"
      return 0
    fi
  fi
  if command -v lsof >/dev/null 2>&1; then
    pid="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n1 || true)"
    if [[ -n "$pid" ]]; then
      printf '%s' "$pid"
      return 0
    fi
  fi
  printf ''
}

# ¿El PID desciende de ESTE `start-local.sh`? Prueba de propiedad estricta:
# el ancestro debe ser un intérprete de shell cuyo primer argumento sea el script
# (no basta con que un comando cualquiera mencione la ruta en su línea de args).
pid_is_launcher_owned() {
  local pid="$1" hops=0 ppid arg0 script_arg
  local -a argv
  [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]] || return 1
  while [[ "$pid" =~ ^[0-9]+$ && "$pid" != "0" && "$pid" != "1" && $hops -lt 30 ]]; do
    if [[ -r "/proc/$pid/cmdline" ]]; then
      argv=()
      while IFS= read -r -d '' arg0; do argv+=("$arg0"); done < "/proc/$pid/cmdline" 2>/dev/null || true
      arg0="${argv[0]:-}"
      script_arg="${argv[1]:-}"
      if [[ "$(basename -- "$arg0")" =~ ^(bash|sh|dash)$ ]]; then
        case "$script_arg" in
          "$SCRIPT_DIR/start-local.sh"|"$PROJECT_DIR/scripts/start-local.sh"|"scripts/start-local.sh"|"./scripts/start-local.sh")
            return 0
            ;;
        esac
      fi
    fi
    ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
    [[ -n "$ppid" ]] || return 1
    pid="$ppid"
    hops=$((hops + 1))
  done
  return 1
}

# --- Procesos ----------------------------------------------------------------
# Arranca un comando en su propia sesión (setsid) para poder terminar todo su
# árbol en el cleanup sin afectar a procesos preexistentes.
start_service() {
  local prefix="$1"; shift
  local pid
  if [[ "$HAS_SETSID" == "1" ]]; then
    setsid "$@" > >(log_prefix "$prefix") 2>&1 &
  else
    "$@" > >(log_prefix "$prefix") 2>&1 &
  fi
  pid=$!
  STARTED_PIDS+=("$pid")
}

# ¿Todos los procesos que inició el script ya terminaron?
all_started_dead() {
  local pid
  for pid in "${STARTED_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      return 1
    fi
  done
  return 0
}

terminate_tree() {
  local pid="$1" sig="${2:-TERM}"
  if [[ "$HAS_SETSID" == "1" ]]; then
    kill "-$sig" "-$pid" 2>/dev/null && return 0
  fi
  # Respaldo sin setsid: primero hijos directos, luego el proceso.
  pkill "-$sig" -P "$pid" 2>/dev/null || true
  kill "-$sig" "$pid" 2>/dev/null || true
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ ${#STARTED_PIDS[@]} -gt 0 ]]; then
    printf '\n==> Deteniendo solo los procesos iniciados por este script...\n'
    local pid i alive
    for pid in "${STARTED_PIDS[@]}"; do
      terminate_tree "$pid" TERM
    done
    for pid in "${STARTED_PIDS[@]}"; do
      alive=0
      for i in $(seq 1 15); do
        if ! kill -0 "$pid" 2>/dev/null; then
          alive=0
          break
        fi
        alive=1
        sleep 0.2
      done
      [[ "$alive" == "1" ]] && terminate_tree "$pid" KILL
    done
    wait 2>/dev/null || true
  fi
  printf '==> Contenedores y volúmenes de MongoDB local y MariaDB local NO se han detenido.\n'
  printf '==> Procesos preexistentes (no creados aquí) NO se han detenido.\n'
  exit "$status"
}

on_signal() {
  printf '\n==> Ctrl-C / señal recibida. Deteniendo este arranque...\n'
  exit 130
}

trap cleanup EXIT
trap on_signal INT TERM

# --- Entorno local fail-closed ----------------------------------------------
apply_local_isolation_env() {
  # El entorno del shell prevalece sobre `node --env-file`, así que exportar aquí
  # anula cualquier MONGODB_URI heredada o definida en .env.contact.local.
  export MONGODB_URI="$LOCAL_MONGODB_URI"

  # MariaDB local por TCP loopback en 3307 (compose existente).
  export CONTACT_DB_TARGET=local
  export MYSQL_HOST="$MONGO_HOST"
  export MYSQL_PORT="$CONTACT_DB_PORT"
  export MYSQL_SOCKET_PATH=""

  # Integraciones externas: credenciales vacías => bloqueo fail-closed real.
  export RESEND_API_KEY=""
  export CONTACT_FROM_EMAIL=""
  export CONTACT_TO_EMAIL=""
  export PLACETOPAY_LOGIN=""
  export PLACETOPAY_TRANKEY=""
  # Selector NO productivo. Por sí solo no basta: el bloqueo son las credenciales vacías.
  export PLACETOPAY_ENV=sandbox
  export FRONTEND_URL="http://localhost:5173"

  info "Entorno local forzado: MONGODB_URI=$LOCAL_MONGODB_URI (loopback, sin credenciales)."
  info "  MariaDB local 127.0.0.1:$CONTACT_DB_PORT; Resend/PlaceToPay sin credenciales (fail-closed)."
  info "  .env.contact.local no se modifica; cualquier valor heredado queda anulado."
}

# --- Pasos -------------------------------------------------------------------
ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    fail "No existe $ENV_FILE. Créalo desde .env.example (ver CONTACT-LOCAL.md)."
  fi
}

mongo_eval() {
  docker exec "$RESOLVED_MONGO_CONTAINER" mongosh --quiet --eval "$1" 2>/dev/null | tr -d '\r' | tail -n1
}

ensure_mongo() {
  info "Asegurando MongoDB local exclusivo ($MONGO_PROJECT/$MONGO_SERVICE)..."
  if [[ ! -f "$MONGO_COMPOSE_FILE" ]]; then
    fail "No existe $MONGO_COMPOSE_FILE."
  fi

  local existing
  existing="$(mongo_container_name)"
  if [[ -n "$existing" ]]; then
    info "Contenedor Mongo local ya presente; se reutiliza sin recrear."
  else
    if port_in_use "$MONGO_PORT"; then
      fail "El puerto $MONGO_PORT está ocupado por una identidad desconocida (no es el proyecto Compose $MONGO_PROJECT). Se aborta en lugar de reutilizar un MongoDB ajeno."
    fi
    info "Levantando contenedor MongoDB local (imagen oficial con versión fijada)..."
    if ! mongo_compose up -d; then
      fail "No se pudo levantar el MongoDB local."
    fi
  fi

  RESOLVED_MONGO_CONTAINER="$(mongo_container_name)"
  [[ -n "$RESOLVED_MONGO_CONTAINER" ]] || fail "No se encontró el contenedor MongoDB local tras 'up'."

  # Publicación exclusivamente loopback.
  local published
  published="$(docker port "$RESOLVED_MONGO_CONTAINER" 27017/tcp 2>/dev/null | tr -d '\r' || true)"
  if ! grep -qx "${MONGO_HOST}:${MONGO_PORT}" <<<"$published"; then
    fail "El MongoDB local no publica únicamente ${MONGO_HOST}:${MONGO_PORT}; se aborta por seguridad."
  fi

  # Volumen nombrado propio del proyecto, sin binds a rutas de producción.
  local mounts
  mounts="$(docker inspect --format '{{range .Mounts}}{{.Name}}{{"\n"}}{{end}}' "$RESOLVED_MONGO_CONTAINER" 2>/dev/null || true)"
  if ! grep -qx "$MONGO_VOLUME" <<<"$mounts"; then
    fail "El MongoDB local no usa el volumen propio $MONGO_VOLUME."
  fi

  info "Esperando estado healthy de MongoDB local (máx ${MONGO_READY_TIMEOUT}s)..."
  local deadline=$((SECONDS + MONGO_READY_TIMEOUT)) state=""
  while ((SECONDS < deadline)); do
    state="$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$RESOLVED_MONGO_CONTAINER" 2>/dev/null || true)"
    case "$state" in
      "running healthy") info "MongoDB local healthy (healthcheck real con mongosh/ping)." ; break ;;
      exited*|dead*|removing*)
        fail "El contenedor MongoDB local terminó ($state). Revisa: docker logs $RESOLVED_MONGO_CONTAINER"
        ;;
    esac
    sleep "$DB_POLL_INTERVAL"
  done
  [[ "$state" == "running healthy" ]] || fail "MongoDB local no alcanzó 'healthy' en ${MONGO_READY_TIMEOUT}s."

  # Ping no destructivo desde dentro del contenedor.
  local ping
  ping="$(mongo_eval 'db.adminCommand({ ping: 1 }).ok')"
  if [[ "$ping" != "1" ]]; then
    fail "Ping no destructivo a MongoDB local falló."
  fi

  info "MongoDB local operativo y aislado en $LOCAL_MONGODB_URI (base vacía; volumen $MONGO_VOLUME)."
}

ensure_mariadb() {
  info "Asegurando MariaDB local (npm run contact:db:up)..."
  if ! npm run contact:db:up; then
    fail "No se pudo levantar MariaDB. Revisa Docker y vuelve a intentarlo."
  fi

  info "Esperando estado healthy de MariaDB (127.0.0.1:${CONTACT_DB_PORT}, máx ${DB_READY_TIMEOUT}s)..."
  local deadline=$((SECONDS + DB_READY_TIMEOUT)) status_output
  while ((SECONDS < deadline)); do
    status_output="$(npm run --silent contact:db:status 2>&1 || true)"
    if grep -qi 'healthy' <<<"$status_output"; then
      info "MariaDB operativa (healthy) en 127.0.0.1:${CONTACT_DB_PORT} (target local)."
      return 0
    fi
    sleep "$DB_POLL_INTERVAL"
  done
  fail "MariaDB no alcanzó 'healthy' en ${DB_READY_TIMEOUT}s (npm run contact:db:status)."
}

ensure_backend() {
  if any_http_200 "${BACKEND_HEALTH_URLS[@]}"; then
    local pid
    pid="$(listener_pid 3001)"
    if [[ -n "$pid" ]] && pid_is_launcher_owned "$pid"; then
      info "Backend ya responde HTTP 200 y fue iniciado por ilb-local; se reutiliza (sin duplicar)."
      return 0
    fi
    cat >&2 <<'MSG'
ERROR: El puerto 3001 ya está ocupado por un backend que NO fue iniciado por
ilb-local. No se puede demostrar que use el MongoDB local ni que las
integraciones externas (Resend/PlaceToPay) estén bloqueadas, así que se aborta
sin tocar ese proceso (fail-closed).

Detén ese backend (Ctrl-C en su terminal) y vuelve a ejecutar ilb-local.
MSG
    exit 1
  fi
  info "Arrancando backend (npm run contact:dev:server) con la URI local forzada..."
  start_service "[backend]" npm run contact:dev:server
  info "Esperando backend HTTP 200 (máx ${BACKEND_READY_TIMEOUT}s)..."
  local deadline=$((SECONDS + BACKEND_READY_TIMEOUT))
  while ((SECONDS < deadline)); do
    if any_http_200 "${BACKEND_HEALTH_URLS[@]}"; then
      info "Backend operativo en http://localhost:3001"
      return 0
    fi
    if all_started_dead; then
      fail "El backend terminó antes de responder. Revisa los logs [backend]."
    fi
    sleep "$HTTP_POLL_INTERVAL"
  done
  fail "El backend no respondió HTTP 200 en ${BACKEND_READY_TIMEOUT}s (http://localhost:3001/api/health)."
}

ensure_frontend() {
  if any_http_200 "${FRONTEND_HEALTH_URLS[@]}"; then
    info "Frontend ya responde HTTP 200; se reutiliza (sin duplicar)."
    return 0
  fi
  info "Arrancando frontend (npm run dev)..."
  start_service "[frontend]" npm run dev
  info "Esperando frontend HTTP 200 (máx ${FRONTEND_READY_TIMEOUT}s)..."
  local deadline=$((SECONDS + FRONTEND_READY_TIMEOUT))
  while ((SECONDS < deadline)); do
    if any_http_200 "${FRONTEND_HEALTH_URLS[@]}"; then
      info "Frontend operativo en http://localhost:5173/"
      return 0
    fi
    if all_started_dead; then
      fail "El frontend terminó antes de responder. Revisa los logs [frontend]."
    fi
    sleep "$HTTP_POLL_INTERVAL"
  done
  fail "El frontend no respondió HTTP 200 en ${FRONTEND_READY_TIMEOUT}s (http://localhost:5173/)."
}

# Prueba de conectividad/auto-bootstrap del backend únicamente contra el Mongo
# local. No realiza ninguna llamada externa.
verify_backend_mongo_local() {
  info "Verificando backend ↔ MongoDB local (/api/config, sin llamadas externas)..."
  local deadline=$((SECONDS + 30)) status=""
  while ((SECONDS < deadline)); do
    status="$(http_status "http://127.0.0.1:3001/api/config")"
    [[ "$status" == "200" ]] && break
    sleep "$HTTP_POLL_INTERVAL"
  done
  if [[ "$status" != "200" ]]; then
    fail "/api/config no respondió HTTP 200 contra el MongoDB local (último estado: $status)."
  fi

  local count
  count="$(mongo_eval 'db.getSiblingDB("administracion").admin_config.countDocuments({ key: "main" })')"
  if [[ "$count" =~ ^[0-9]+$ && "$count" -ge 1 ]]; then
    info "Backend↔Mongo local confirmado: la configuración local existe en el contenedor $RESOLVED_MONGO_CONTAINER."
  else
    fail "El backend respondió /api/config pero no se observó la configuración en el MongoDB local; se aborta para no asumir un destino remoto."
  fi
}

check_node_version() {
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  if [[ -n "$major" && "$major" != "20" ]]; then
    warn "El proyecto declara Node 20.x; detectado $(node -v). No se instala ni actualiza nada."
  fi
}

main() {
  cd "$PROJECT_DIR"
  info "Industria Bolera — arranque local aislado ($PROJECT_DIR)"
  check_node_version
  ensure_env_file
  ensure_local_docker
  apply_local_isolation_env
  ensure_mongo
  ensure_mariadb
  ensure_backend
  ensure_frontend
  verify_backend_mongo_local

  info "Stack local listo (aislado de MongoDB Atlas, PlaceToPay productivo y Resend)."
  info "  Backend : http://localhost:3001/api/health"
  info "  Frontend: http://localhost:5173/"
  info "  MongoDB : $LOCAL_MONGODB_URI (local, loopback; arranca vacío)"
  info "  MariaDB : 127.0.0.1:${CONTACT_DB_PORT} (docker compose: contact-db)"
  info "  Externo : Resend/PlaceToPay SIN credenciales (fail-closed); PLACETOPAY_ENV=sandbox (selector no productivo)."
  if [[ ${#STARTED_PIDS[@]} -gt 0 ]]; then
    info "Presiona Ctrl-C para detener solo los procesos iniciados aquí (contenedores y volúmenes se conservan)."
    wait
  else
    info "Todos los servicios ya estaban activos; no hay procesos que supervisar."
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
