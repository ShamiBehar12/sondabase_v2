# Sondabase v2

Sistema de gestión de certificados y documentos de proyectos SONDA Smart Cities, con pipeline RAG (Retrieval-Augmented Generation) integrado para consulta inteligente de documentos.

---

## Estado actual de la plataforma

### Funcionalidades activas
| Sección | Ruta | Descripción |
|---------|------|-------------|
| Dashboard | `/dashboard` | Estadísticas reales: certificados, ediciones, aprobaciones, usuarios |
| Certificados | `/certificates` | Subida individual y carga masiva de PDFs, aprobación de documentos |
| Mis Certificados | `/my-certificates` | Certificados del usuario autenticado |
| Asistente IA | `/ai-chat` | Chat RAG sobre el portafolio Smart Cities (backend RACER), sesiones persistentes |
| Aprobación | `/certificate-approval` | Panel admin para aprobar/rechazar certificados |
| Usuarios | `/users` | Gestión de usuarios (solo admin) |

### Funcionalidades temporalmente ocultas
Estas rutas siguen existiendo en el código y son accesibles por URL directa; solo están escondidas del menú lateral (comentadas en `src/components/layout/AppSidebar.tsx`):
- `/success-stories` — Historias de éxito
- `/professional-certificates` — Certificados profesionales
- `/my-success-stories` — Mis historias
- `/success-story-approval` — Aprobación de historias
- `/ai-admin` — Administración IA

---

## Servicios

La aplicación requiere **4 servicios** corriendo simultáneamente:

| Servicio | Puerto | Tecnología | Descripción |
|----------|--------|-----------|-------------|
| **MySQL** | 3306 | Docker | Base de datos principal |
| **Backend** | 4000 | Node.js + Fastify | API REST, auth JWT, OCR, proxy hacia RACER |
| **Frontend** | 8080 | React + Vite | Interfaz web |
| **RACER** | 8000 | Python + FastAPI | Servidor RAG (ChromaDB + SQLite) |

---

## Primer despliegue (desde cero)

### Requisitos

- Node.js >= 18
- Python >= 3.10
- Docker (para MySQL)
- Cuenta OpenAI con API key

---

### Paso 1 — Variables de entorno

**`backend/.env`** (copiar desde `backend/.env.example`):

```env
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:8080
DATABASE_URL=mysql://root:root@127.0.0.1:3306/sondabase
JWT_SECRET=cambia-este-secreto-acceso
REFRESH_TOKEN_SECRET=cambia-este-secreto-refresh
UPLOAD_DIR=../uploads
OPENAI_API_KEY=sk-...
RACER_URL=http://localhost:8000
```

**`racer/.env`**:

```env
OPENAI_API_KEY=sk-...
```

**`.env`** (raíz del proyecto, para el frontend):

```env
VITE_API_URL=http://127.0.0.1:4000
```

---

### Paso 2 — MySQL

```bash
docker compose up -d mysql
```

Espera ~10 segundos a que MySQL termine de iniciar antes del siguiente paso.

---

### Paso 3 — Base de datos (migraciones)

```bash
npm run db:init     # prisma generate + migrate deploy
```

Opcional — crear un usuario admin de prueba:

```bash
npm run db:setup    # prisma generate + migrate deploy + seed
```

---

### Paso 4 — RACER (primera vez)

```bash
cd racer

# Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

Si ya tienes documentos en los archivos JSONL de respaldo (`data/metadata.jsonl`, `data/chunks.jsonl`), reconstruye el índice vectorial antes de arrancar el servidor:

```bash
python rebuild_chromadb.py
```

> Sin documentos previos: omite el paso anterior — el servidor arranca con el índice vacío.

---

### Paso 5 — Instalar dependencias

Instala las dependencias de frontend, backend y RACER en un solo comando:

```bash
# Desde la raíz del proyecto
npm run setup
```

Equivale a: `npm install` + `npm --prefix backend install` + `pip install -r racer/requirements.txt`.

---

### Verificación del primer despliegue

Levanta todos los servicios (ver sección siguiente) y comprueba:

| Comprobación | Comando / URL |
|---|---|
| MySQL activo | `docker compose ps` |
| Backend OK | `curl http://127.0.0.1:4000/health` |
| RACER OK | `curl http://localhost:8000/health` (responde `{"chunks":N,"docs":N}`) |
| Frontend | Abre `http://localhost:8080` |
| Login | Registra o inicia sesión, verifica que el Dashboard carga datos reales |

---

## Arranque diario

### Opción rápida — un solo comando

Levanta frontend, backend y RACER en paralelo (con logs en colores por servicio):

```bash
docker compose up -d mysql   # MySQL primero, siempre por separado
npm run dev:all              # FE + BE + RACER en una sola terminal
```

> `npm run dev:all` usa `concurrently` y muestra los logs de los tres servicios con prefijos `[FE]`, `[BE]`, `[RACER]`. Pulsa `Ctrl+C` para detener los tres a la vez.

### Opción manual — una terminal por servicio

**Terminal 1 — MySQL**
```bash
docker compose up -d mysql
```

**Terminal 2 — RACER**
```bash
cd racer
source venv/bin/activate    # Linux/Mac
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 3 — Backend**
```bash
cd backend
npm run dev
```

**Terminal 4 — Frontend**
```bash
# desde la raíz del proyecto
npm run dev
```

### URLs locales

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://127.0.0.1:4000 |
| RACER API | http://localhost:8000 |
| Health backend | http://127.0.0.1:4000/health |
| Health RACER | http://localhost:8000/health |

---

## Empezar desde cero (borrar todos los documentos)

Para eliminar todos los documentos subidos y volver a un estado limpio. **Detén todos los servicios primero.**

### 1 — Borrar archivos PDF subidos

```bash
# desde la raíz del proyecto
rm -rf uploads/certificates/
# NO borres uploads/avatars/ — ahí están las fotos de perfil
```

### 2 — Borrar el índice vectorial de RACER (ChromaDB)

```bash
rm -rf racer/chroma/
# si usas la carpeta antigua del proyecto:
rm -rf racer/08ChromaDB/
```

### 3 — Borrar la base de datos SQLite de RACER

```bash
rm racer/data/documents.db
```

### 4 — Vaciar los backups JSONL de RACER

```bash
> racer/data/metadata.jsonl
> racer/data/chunks.jsonl
```

> Es importante vaciarlos: si dejas datos aquí, `rebuild_chromadb.py` los reimportará al reiniciar RACER.

### 5 — Borrar registros de certificados en MySQL

```bash
docker compose exec mysql mysql -u root -proot sondabase \
  -e "DELETE FROM certificate_approvals; DELETE FROM certificate_rejections; DELETE FROM certificates;"
```

O de forma interactiva:

```bash
docker compose exec mysql mysql -u root -proot sondabase
```

```sql
DELETE FROM certificate_approvals;
DELETE FROM certificate_rejections;
DELETE FROM certificates;
```

### 6 — (Opcional) Borrar historial de chat IA

```bash
rm racer/racer_history.db
```

```bash
docker compose exec mysql mysql -u root -proot sondabase \
  -e "DELETE FROM ai_chat_messages; DELETE FROM ai_chat_sessions;"
```

### 7 — Reiniciar RACER

```bash
cd racer
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

`http://localhost:8000/health` devolverá `{"chunks":0,"docs":0}`. A partir de aquí puedes subir documentos nuevos desde `/certificates`.

---

## Arquitectura

```
                    ┌──────────────────┐
                    │  React Frontend  │  :8080
                    │  (Vite + TS)     │
                    └────────┬─────────┘
                             │ HTTP / JWT
                    ┌────────▼─────────┐
                    │ Backend Fastify  │  :4000
                    │ Node.js + Prisma │
                    └──┬───────────┬───┘
                       │           │ HTTP
          ┌────────────▼──┐  ┌─────▼──────────────┐
          │  MySQL        │  │  RACER FastAPI      │  :8000
          │  (Docker)     │  │  ChromaDB + SQLite  │
          └───────────────┘  └────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │ OpenAI API      │
                              │ (embeddings +   │
                              │  gpt-4o-mini)   │
                              └─────────────────┘
```

---

## Pipeline de documentos

### Ingesta de un nuevo PDF (desde la UI)

```
Usuario sube PDF en /certificates (pestaña Subir)
    │
    ▼
Backend: guarda en uploads/certificates/<uuid>.<ext>
    │
    ▼
Backend: extrae texto (pdf-parse → Tesseract OCR si falla)
    │
    ▼
Admin aprueba el certificado en /certificate-approval
    │
    ▼
Backend dispara RACER /ingest (fire-and-forget):
  1. Deduplicación por SHA-256 del texto
  2. Chunking (2200 chars máx, 250 mín, 180 overlap)
  3. Metadata con GPT-4o-mini (tipo, cliente, país, año, apostilla…)
  4. Almacena en ChromaDB (colecciones "chunks" + "docs")
  5. Almacena en SQLite (tabla documents)
  6. Append en data/chunks.jsonl + data/metadata.jsonl (backup)
```

### Carga masiva

Desde `/certificates` → pestaña **Subir** → botón **Carga masiva**:
- Drag & drop de PDFs o carpetas completas
- Deduplicación automática (los duplicados se marcan como "Duplicado" sin error)
- Cada archivo pasa por el mismo pipeline de ingesta anterior
- Estado por archivo: En cola → Subiendo → Procesando → Listo / Duplicado / Error

### Consulta RAG (Asistente IA)

```
Usuario escribe pregunta en /ai-chat
    │
    ▼
RACER /query:
  1. Detecta tipo de consulta (doc / chunk / hybrid)
  2. Extrae filtros del texto (país, apostilla, año)
  3. Búsqueda semántica en ChromaDB
  4. Re-ranking multi-factor (semántico 55% + léxico 30% + frase + metadata)
  5. Construye contexto RAG + llama a gpt-4o-mini
  6. Devuelve respuesta + fuentes (archivo, país, año, apostilla, distancia)
    │
    ▼
Backend persiste mensajes en MySQL (tabla ai_chat_messages)
```

---

## Stack técnico

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Radix UI
- React Hook Form + Zod
- i18next (ES / PT / EN)

### Backend
- Fastify (Node.js) + Prisma ORM + MySQL
- JWT (access token + refresh token)
- Tesseract.js (OCR), pdf-parse, pdfjs-dist
- OpenAI SDK

### RACER
- FastAPI + Uvicorn
- ChromaDB 0.5.7 (vector store persistente)
- Embeddings: `text-embedding-3-small`
- LLM: `gpt-4o-mini`
- SQLite (índice de metadata para filtros rápidos)

---

## Estructura del proyecto

```
sondabase_v2/
├── src/                      # Frontend React
│   ├── pages/                # Vistas (Dashboard, Certificates, AIChat…)
│   ├── components/           # Componentes reutilizables
│   ├── hooks/                # Custom hooks
│   ├── contexts/             # AuthContext
│   ├── lib/api-client.ts     # Cliente HTTP con JWT automático
│   └── i18n/locales/         # Traducciones (es.json / pt.json / en.json)
├── backend/
│   ├── src/server.ts         # Fastify app (todas las rutas)
│   ├── src/lib/              # auth, pdf, ai, prisma, mappers, files, query
│   ├── prisma/schema.prisma  # Modelos de BD
│   └── scripts/              # seed.ts, import-certificates.ts
├── racer/
│   ├── server.py             # FastAPI RACER (/query, /ingest, /health…)
│   ├── ingest.py             # Pipeline de ingesta
│   ├── rebuild_chromadb.py   # Reconstruye el índice desde los JSONL de backup
│   ├── rag_router.py         # Clasificador de tipo de consulta
│   ├── r09erank.py           # Re-ranking de resultados
│   ├── data/
│   │   ├── metadata.jsonl    # Backup de metadata (fuente de verdad offline)
│   │   ├── chunks.jsonl      # Backup de chunks de texto
│   │   └── documents.db      # SQLite — índice de metadata para filtros rápidos
│   └── chroma/               # Vector store persistente (no versionar en git)
├── uploads/
│   ├── certificates/         # PDFs de certificados subidos
│   └── avatars/              # Fotos de perfil
└── docker-compose.yml
```

---

## API — Endpoints principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Inicio de sesión |
| POST | `/auth/register` | Registro |
| POST | `/auth/logout` | Cierre de sesión |
| GET | `/auth/me` | Usuario autenticado |

### Datos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/query/:table` | Consultar con filtros, orden, paginación |
| POST | `/api/db/:table` | Crear registros |
| PATCH | `/api/db/:table` | Actualizar registros |
| DELETE | `/api/db/:table` | Eliminar registros |

### Storage
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/storage/:bucket/upload` | Subir archivo |
| GET | `/api/storage/:bucket/file` | Descargar archivo |
| GET | `/api/storage/:bucket/signed-url` | URL con token temporal |

### RACER
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/racer/health` | Estado y contadores de ChromaDB |
| GET | `/api/racer/docs` | Listado de documentos |
| POST | `/api/racer/query` | Consulta RAG en lenguaje natural |
| POST | `/api/racer/ingest` | Ingestar un PDF |
| POST | `/api/racer/ingest-batch` | Ingesta en lote |
| POST | `/api/racer/reingest-metadata` | Re-extraer metadata de un documento |

### Chat IA
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ai/chat/sessions` | Listar sesiones del usuario |
| POST | `/api/ai/chat/sessions` | Crear nueva sesión |
| GET | `/api/ai/chat/sessions/:id/messages` | Mensajes de una sesión |
| POST | `/api/ai/chat/sessions/:id/messages` | Guardar mensaje en sesión |
| DELETE | `/api/ai/chat/sessions/:id` | Eliminar sesión |

---

## Scripts

### Frontend / proyecto completo
```bash
npm run setup      # Instala dependencias de FE + BE + RACER (pip) de una vez
npm run db:init    # prisma generate + migrate (sin seed)
npm run db:setup   # prisma generate + migrate + seed (con datos de prueba)
npm run dev:all    # Levanta FE + BE + RACER en paralelo con logs por colores
npm run dev        # Solo el frontend
npm run build      # Build de producción del frontend
npm run lint       # Lint
```

### Backend
```bash
npm --prefix backend run dev              # Servidor de desarrollo
npm --prefix backend run build            # Compilar TypeScript
npm --prefix backend run prisma:generate  # Regenerar Prisma Client
npm --prefix backend run prisma:migrate   # Aplicar migraciones
npm --prefix backend run seed             # Sembrar datos de prueba
```

### RACER
```bash
cd racer
uvicorn server:app --port 8000 --reload    # Servidor
python rebuild_chromadb.py                 # Reconstruir índice desde JSONL
```

---

## Decisiones de arquitectura

- Frontend fuera de Docker durante desarrollo; MySQL en Docker
- Archivos en `uploads/` local (no S3/object storage)
- JWT con access token corto + refresh token largo
- RACER como servicio Python separado (ChromaDB no funciona bien embebido en Node.js)
- Deduplicación por SHA-256 del contenido del texto, no del nombre del archivo
- Ingesta a RACER es fire-and-forget al aprobar certificados (no bloquea la respuesta)
- `chroma/` no se versiona en git — se regenera con `rebuild_chromadb.py` desde los JSONL
- Los JSONL (`metadata.jsonl`, `chunks.jsonl`) son la fuente de verdad offline para reconstrucción

---

## Deploy en producción

- **Frontend**: Vercel, Render Static Site, o Netlify
- **Backend**: Railway, Render Web Service, o VM propia
- **RACER**: servicio Python separado (Railway, Fly.io, o VM propia)
- **MySQL**: PlanetScale, Railway MySQL, o RDS
- **Volúmenes persistentes obligatorios**: `uploads/`, `racer/data/`, `racer/chroma/`

> Antes de producción: cambiar todos los secretos JWT, configurar CORS con el dominio real, habilitar backups de MySQL y de los JSONL del RACER.
