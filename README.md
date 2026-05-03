# Sondabase v2

Sistema integral de gestión de certificados, historias de éxito y documentación de proyectos SONDA Smart Cities, con pipeline RAG (Retrieval-Augmented Generation) integrado para consulta inteligente de documentos.

---

## Servicios en ejecución

La aplicación está compuesta por **4 servicios** que deben ejecutarse simultáneamente:

| Servicio | Puerto | Tecnología | Descripción |
|----------|--------|-----------|-------------|
| **MySQL** | 3306 | Docker | Base de datos relacional principal |
| **Backend** | 4000 | Node.js + Fastify | API REST, auth JWT, OCR, proxy hacia RACER |
| **Frontend** | 8080 | React + Vite | Interfaz web |
| **RACER** | 8000 | Python + FastAPI | Servidor RAG Smart Cities (ChromaDB + SQLite) |

Los scripts numerados en `racer/` (01copy.py, 03read.py, etc.) son utilidades **de procesamiento offline de una sola vez** — no servidores. No es necesario ejecutarlos en el día a día.

---

## Arranque rápido

### Requisitos previos

- Node.js ≥ 18
- Python ≥ 3.10
- Docker (para MySQL)
- Cuenta OpenAI con API key

---

### 1 — MySQL (Docker)

```bash
docker compose up -d mysql
```

---

### 2 — RACER (Python RAG)

```bash
cd racer

# Primera vez: crear entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

pip install -r requirements.txt
```

Crear `racer/.env`:

```env
OPENAI_API_KEY=sk-...
```

Primera vez — reconstruir el índice vectorial desde los JSONL existentes:

```bash
python rebuild_chromadb.py
```

Iniciar servidor:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Verificar: `http://localhost:8000/health` debe devolver `{"status":"ok","chunks":N,"docs":N}`.

---

### 3 — Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env   # editar valores
```

Contenido mínimo de `backend/.env`:

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

Migrar base de datos e iniciar:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

---

### 4 — Frontend (React)

En la raíz del proyecto:

```bash
npm install
```

Crear `.env` en la raíz:

```env
VITE_API_URL=http://127.0.0.1:4000
```

```bash
npm run dev
```

---

### URLs locales

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://127.0.0.1:4000 |
| RACER API | http://localhost:8000 |
| Health backend | http://127.0.0.1:4000/health |
| Health RACER | http://localhost:8000/health |

---

## Primer uso — sembrar los documentos RACER en MySQL

Después de levantar todos los servicios, entrar a `/ai-admin` con una cuenta admin → sección **RACER Smart Cities** → botón **"Sembrar X documentos"**.

Esto migra todos los documentos ya ingresados en ChromaDB como registros `Certificate` verificados en MySQL. Los que ya existen se omiten automáticamente. Solo es necesario hacerlo una vez.

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

## Stack técnico

### Frontend
- React 18 + TypeScript + Vite
- React Router + TanStack React Query
- Tailwind CSS + shadcn/ui + Radix UI
- React Hook Form + Zod
- i18next (ES / PT / EN)
- react-markdown + remark-gfm (renderizado de tablas Markdown en el chat)

### Backend
- Fastify (Node.js)
- Prisma ORM + MySQL
- JWT (access token + refresh token)
- bcryptjs
- Tesseract.js (OCR para PDFs escaneados)
- pdf-parse / pdfjs-dist
- OpenAI SDK

### RACER (Smart Cities RAG)
- FastAPI + Uvicorn
- ChromaDB 0.5.7 (base vectorial persistente)
- Embeddings: `text-embedding-3-small` (OpenAI)
- LLM: `gpt-4o-mini` (extracción de metadata + respuestas contextualizadas)
- SQLite (índice de metadata para consultas rápidas)

---

## Funcionalidades

### Gestión de documentos
- **Certificados** (`/certificates`, `/my-certificates`): subida de PDFs, previsualización, descarga, aprobación/rechazo por administradores, OCR automático para PDFs escaneados
- **Certificados profesionales** (`/professional-certificates`): registro de credenciales personales
- **Historias de éxito** (`/success-stories`, `/my-success-stories`): casos de negocio multilingüe con flujo de aprobación
- **Aprobaciones** (`/certificate-approval`, `/success-story-approval`): panel admin para revisar y aprobar/rechazar

### Dashboard (`/dashboard`)
Todos los datos son reales — sin valores de ejemplo:
- Conteo de historias publicadas y pendientes
- Certificados totales, en revisión y porcentaje verificado
- Alertas de certificados próximos a vencer (30 días)
- Feed de actividad reciente con timestamps relativos
- Aprobaciones pendientes, total de usuarios, certificados profesionales

### RACER Smart Cities (`/smart-cities`)
- **Chat RAG**: consulta en lenguaje natural sobre el portafolio de proyectos Smart Cities con respuestas citando fuentes (archivo, país, año, apostilla, distancia semántica)
- **Filtros de búsqueda**: por país, con/sin apostilla
- **Renderizado de tablas**: respuestas en Markdown con tablas comparativas de proyectos

### Carga masiva RAG (`/smart-cities/ingest`)
- Subida de PDFs o carpetas completas (drag & drop)
- Deduplicación automática por hash SHA-256 del contenido
- Pipeline completo: upload → extracción de texto (con OCR si necesario) → chunking → metadata GPT → ChromaDB → registro en MySQL como Certificate verificado
- Estado por archivo: pendiente / subiendo / procesando / listo / duplicado / error

### Panel de administración IA (`/ai-admin`)
- Configuración de proveedor, modelo de chat, embeddings, temperatura, Top-K
- **Sección RACER Smart Cities**:
  - Estado del servidor en tiempo real (activo/sin conexión, conteo de docs/chunks)
  - Sembrado en BD: migra documentos del índice RACER a MySQL (una sola vez)
  - Resumen: total de documentos, países únicos, con apostilla, tipos únicos
  - Tabla completa con buscador por nombre, país, cliente o tipo de documento
  - Documentos sin metadata resaltados en naranja
  - Botón de re-extracción individual o masiva (re-ejecuta GPT sobre el texto ya existente en ChromaDB)

### Ingesta automática al aprobar
Cuando un admin aprueba un certificado, el backend dispara automáticamente la ingesta en RACER (fire-and-forget), sin bloquear la respuesta al usuario.

---

## Pipeline RACER — detalle técnico

### Flujo de ingesta (nuevo documento vía web)

```
Usuario sube PDF en /smart-cities/ingest
    │
    ▼
Backend: upload a storage (certificates bucket)
    │
    ▼
Backend: extracción de texto (pdf-parse → Tesseract OCR si falla)
    │
    ▼
RACER /ingest:
  1. Deduplicación (SHA-256 del texto)
  2. Chunking (2200 chars max, 250 min, 180 overlap)
  3. Metadata con GPT-4o-mini (tipo, cliente, país, año, apostilla, dominios, resumen)
  4. Almacena en ChromaDB (colección "chunks" + "docs")
  5. Almacena en SQLite (tabla documents)
  6. Append en data/chunks.jsonl + data/metadata.jsonl (backup)
    │
    ▼
Backend: crea Certificate en MySQL (isVerified: true)
```

### Flujo de consulta

```
Usuario escribe pregunta en /smart-cities
    │
    ▼
RACER /query:
  1. Detecta tipo de consulta (doc / chunk / hybrid)
  2. Extrae filtros del texto (país, apostilla, año)
  3. Búsqueda semántica en ChromaDB
  4. Re-ranking multi-factor (semántico 55% + léxico 30% + frase + metadata)
  5. Construye contexto RAG + llama a gpt-4o-mini con system prompt SONDA
  6. Devuelve respuesta + fuentes citadas
```

### Componentes RACER

| Archivo | Función |
|---------|---------|
| `server.py` | FastAPI: `/query`, `/rfp`, `/ingest`, `/reingest/metadata`, `/health` |
| `ingest.py` | Pipeline de ingesta completo (chunking, metadata GPT, ChromaDB, SQLite, JSONL) |
| `rebuild_chromadb.py` | Reconstruye ChromaDB + SQLite desde `data/metadata.jsonl` + `data/chunks.jsonl` |
| `rag_router.py` | Clasificador de consultas: "doc" / "chunk" / "hybrid" |
| `r09erank.py` | Re-ranking post-búsqueda (semántico + léxico + phrase matching + bonus de metadata) |

### Scripts de procesamiento offline (solo primera vez)

| Archivo | Función | Estado |
|---------|---------|--------|
| `03read.py` | Extrae texto de PDFs con PyMuPDF + Tesseract OCR, guarda como .txt | Usar si se tienen nuevos PDFs que procesar manualmente |
| `rebuild_chromadb.py` | Reconstruye el índice vectorial desde los JSONL | Usar si se corrompe ChromaDB o se cambia de máquina |

---

## Estructura del proyecto

```
sondabase_v2/
├── src/                      # Frontend React
│   ├── pages/                # Vistas (Dashboard, Certificates, SmartCities…)
│   ├── components/           # Componentes reutilizables
│   ├── hooks/                # Custom hooks (API calls)
│   ├── contexts/             # AuthContext
│   ├── lib/api-client.ts     # Cliente HTTP con JWT automático
│   └── i18n/locales/         # Traducciones (es.json / pt.json / en.json)
├── backend/
│   ├── src/server.ts         # Fastify app (todas las rutas)
│   ├── src/lib/              # auth, pdf, ai, prisma, mappers, files, query
│   ├── prisma/schema.prisma  # Modelos de BD
│   └── scripts/              # seed.ts, import-certificates.ts
├── racer/
│   ├── server.py             # FastAPI RACER
│   ├── ingest.py             # Pipeline de ingesta
│   ├── rebuild_chromadb.py   # Reconstrucción del índice
│   ├── rag_router.py         # Router de consultas
│   ├── r09erank.py           # Re-ranking de resultados
│   ├── 03read.py             # Extracción de texto de PDFs (offline)
│   ├── data/
│   │   ├── metadata.jsonl    # Backup de metadata de documentos
│   │   ├── chunks.jsonl      # Backup de chunks de texto
│   │   └── documents.db      # SQLite index
│   └── 08ChromaDB/           # Vector store persistente (no versionar)
├── uploads/                  # Archivos subidos (PDFs, avatares)
├── docs/                     # Documentación técnica detallada
└── docker-compose.yml
```

---

## API — Endpoints principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Inicio de sesión |
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/logout` | Cierre de sesión |
| GET | `/auth/me` | Usuario autenticado |

### Datos (genérico)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/query/:table` | Consultar con filtros, orden y paginación |
| POST | `/api/db/:table` | Crear registros |
| PATCH | `/api/db/:table` | Actualizar registros |
| DELETE | `/api/db/:table` | Eliminar registros |

### Storage
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/storage/:bucket/upload` | Subir archivo |
| GET | `/api/storage/:bucket/file` | Descargar archivo |
| GET | `/api/storage/:bucket/signed-url` | URL con token temporal |

### Stats
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/stats/dashboard` | Contadores reales y actividad reciente |

### RACER Smart Cities
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/racer/health` | Estado del servidor y contadores de ChromaDB |
| GET | `/api/racer/docs` | Listado de documentos en el índice |
| POST | `/api/racer/query` | Consulta RAG en lenguaje natural |
| POST | `/api/racer/rfp` | Evaluación de pliegos RFP |
| POST | `/api/racer/ingest` | Ingestar PDF (extrae + RACER + crea Certificate) |
| POST | `/api/racer/reingest-metadata` | Re-extraer metadata de documento fallido |
| POST | `/api/racer/ingest-batch` | Ingesta batch (array de archivos) |

### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/seed-racer` | Migrar documentos RACER a MySQL como certificados |

---

## Scripts

### Frontend
```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run lint       # Lint
```

### Backend
```bash
npm --prefix backend run dev               # Servidor de desarrollo
npm --prefix backend run build             # Compilar TypeScript
npm --prefix backend run prisma:generate   # Regenerar Prisma Client
npm --prefix backend run prisma:migrate    # Aplicar migraciones
npm --prefix backend run seed              # Sembrar datos de prueba
```

### RACER
```bash
cd racer
uvicorn server:app --port 8000 --reload    # Servidor
python rebuild_chromadb.py                 # Reconstruir índice desde JSONL
python 03read.py                           # Extraer texto de PDFs (offline)
```

---

## Decisiones de arquitectura

- Frontend fuera de Docker durante desarrollo; MySQL en Docker
- Almacenamiento de archivos local en `uploads/` (no S3)
- JWT con access token (corto) + refresh token (largo) sin dependencia de Supabase
- RACER como servicio Python separado (no embebido en Node.js) para facilitar el uso de librerías Python (ChromaDB, sentence-transformers)
- Deduplicación por hash SHA-256 del contenido del texto (no del nombre del archivo)
- Ingesta a RACER fire-and-forget al aprobar certificados (no bloquea la respuesta al usuario)
- ChromaDB no se versiona en git (se regenera con `rebuild_chromadb.py`)

## Deploy recomendado

- Frontend: Render Static Site o Vercel
- Backend: Render Web Service o Railway
- RACER: servicio Python separado (Railway, Fly.io, o VM propia)
- MySQL: PlanetScale, Railway MySQL, o RDS
- Volumen persistente obligatorio para `uploads/` y `racer/data/`

> Antes de producción: cambiar todos los secretos JWT, configurar CORS con dominio real, habilitar backups de MySQL y de los JSONL del RACER.
