# Pipeline RACER — Archivos y funciones

Describe qué archivos Python participan en cada flujo, en qué orden se ejecutan las funciones, y qué archivos están en desuso.

---

## Archivos activos (usados en producción)

| Archivo | Rol |
|---------|-----|
| `server.py` | Servidor FastAPI — punto de entrada |
| `ingest.py` | Pipeline de ingesta de documentos |
| `pdf_reader.py` | Extracción de texto de PDFs con OCR |

---

## Flujo 1 — Subida y aprobación de un certificado (vía web)

```
Usuario sube PDF en /certificates
        │
        ▼
[backend Node.js]
  Guarda PDF en uploads/certificates/<uuid>.pdf
  Extrae texto: pdf-parse → Tesseract.js si falla
        │
        ▼ (cuando admin aprueba)
  POST /api/racer/ingest  ← proxy del backend hacia RACER
        │
        ▼
[server.py]  POST /ingest
  Recibe: { text, document_id, source_file }
  Llama: ingest_document()  ← ingest.py
        │
        ▼
[ingest.py]  ingest_document()
  1. _content_hash(text)           → SHA-256 del texto
  2. check_duplicate(hash)         → busca en SQLite si ya existe
     └─ si existe → devuelve {"status": "duplicate"}
  3. extract_metadata(text)        → llama GPT-4o-mini
     └─ extrae: tipo, cliente, país, año, apostilla,
                dominios, resumen, idioma, alertas
  4. chunk_text(text)              → divide en chunks
     └─ máx 2200 chars, mín 250, overlap 180
  5. Guarda en ChromaDB
     └─ colección "chunks": cada fragmento con su embedding
     └─ colección "docs":   resumen del documento completo
  6. Guarda en SQLite (data/documents.db)
     └─ tabla documents con toda la metadata
  7. Append en data/chunks.jsonl   → backup offline
  8. Append en data/metadata.jsonl → backup offline
        │
        ▼
  Devuelve { status: "ok", document_id, chunks: N }
```

---

## Flujo 2 — Subida directa de PDF a RACER (sin Node.js)

Usado cuando se llama directamente al endpoint `/ingest/pdf` de RACER (por ejemplo desde herramientas de testing o scripts externos).

```
[server.py]  POST /ingest/pdf
  Recibe: archivo PDF (multipart)
        │
        ▼
[pdf_reader.py]  extract_text_from_pdf(bytes)
  1. _ocr_available()              → verifica si pytesseract está instalado
  2. Abre PDF con PyMuPDF (fitz)
  3. Por cada página:
     _pagina_necesita_ocr(page)    → ¿poco texto o tiene imágenes?
     └─ si no necesita OCR: extrae texto directamente
     └─ si necesita OCR:
        _hacer_ocr_pagina(page)    → renderiza a imagen → Tesseract
  4. _limpiar_texto(texto)         → normaliza espacios y saltos de línea
  Devuelve: string con el texto completo
        │
        ▼
[server.py]  → llama ingest_document()
  (mismo flujo que Flujo 1 desde el paso 1 de ingest.py)
```

---

## Flujo 3 — Consulta del Asistente IA

```
Usuario escribe pregunta en /ai-chat
        │
        ▼
[backend Node.js]
  POST /api/racer/query  ← proxy hacia RACER
        │
        ▼
[server.py]  POST /query
  Recibe: { question, pais?, solo_apostillados? }

  1. detectar_tipo(question)
     └─ reglas heurísticas: ¿pregunta por lista? ¿por definición? ¿término exacto?
     └─ devuelve "doc", "chunk", o "hybrid"

  2. extraer_filtros(question, pais, solo_apostillados)
     └─ detecta país mencionado en el texto
     └─ detecta si pide documentos apostillados
     └─ devuelve dict con filtros para ChromaDB

  3. buscar(question, tipo, filtros, n=8)
     └─ según tipo:
        "doc"    → busca en colección "docs"   (resúmenes)
        "chunk"  → busca en colección "chunks" (fragmentos)
        "hybrid" → busca en ambas y mezcla resultados
     └─ aplica filtros de país/apostilla como where clause
     └─ devuelve top-N resultados con distancia semántica

  4. construir_contexto(items)
     └─ formatea los resultados como texto para el prompt
     └─ incluye fuente, país, año, apostilla, fragmento

  5. Llama a gpt-4o-mini con system prompt SONDA + contexto
     └─ instrucciones: responder en español, citar fuentes,
        usar tablas Markdown si hay comparaciones

  6. Devuelve { answer, sources: [{ archivo, pais, ano, apostillado, distancia }] }
        │
        ▼
[backend Node.js]
  Guarda mensaje usuario en MySQL (ai_chat_messages)
  Guarda mensaje asistente + sourcesJson en MySQL
```

---

## Flujo 4 — Re-extracción de metadata

Cuando un documento tiene metadata incompleta, desde `/ai-admin` se puede re-procesar sin volver a chunkar ni re-embeddear.

```
[server.py]  POST /reingest/metadata
  Recibe: { document_id }

  1. Busca todos los chunks del documento en ChromaDB
  2. Reconstruye el texto completo concatenando los chunks
  3. from ingest import extract_metadata, _safe_meta
     extract_metadata(texto_reconstruido)  → vuelve a llamar GPT-4o-mini
  4. Actualiza registro en SQLite
  5. Actualiza metadata de todos los chunks en ChromaDB
  6. Reescribe la línea en data/metadata.jsonl
```

---

## Flujo 5 — Reconstrucción del índice (recuperación)

Script de línea de comandos, no un endpoint. Se usa si ChromaDB se corrompe o se migra de máquina.

```
python rebuild_chromadb.py
  └─ Lee data/metadata.jsonl  → reconstruye SQLite (data/documents.db)
  └─ Lee data/chunks.jsonl    → reconstruye colección ChromaDB "chunks"
  └─ Lee data/metadata.jsonl  → reconstruye colección ChromaDB "docs"
  └─ Genera embeddings con text-embedding-3-small (llama a OpenAI)
  └─ Nota: consume créditos de OpenAI por cada chunk/doc
```

---

## Archivos deprecated — no se usan en producción

Estos archivos son del pipeline offline original, anterior a la existencia del servidor web. Procesaban PDFs de forma local antes de que existiera la interfaz web de carga masiva.

| Archivo | Qué hacía | Por qué está en desuso |
|---------|-----------|----------------------|
| `01copy.py` | Copiaba PDFs desde OneDrive a una carpeta local | Tiene rutas Windows hardcodeadas. La carga ahora es vía web |
| `03read.py` | Extraía texto de PDFs con OCR, guardaba como .txt | Reemplazado por `pdf_reader.py` dentro del servidor |
| `05chop.py` | Chunkeaba los .txt a JSONL | Reemplazado por `chunk_text()` en `ingest.py`. Tiene además un error de sintaxis en línea 266 |
| `05docresume.py` | Resumía documentos con GPT y guardaba documents.jsonl | Reemplazado por `extract_metadata()` en `ingest.py`. Usa `responses.create()` que es una API de OpenAI deprecated |
| `07embed.py` | Cargaba los JSONL a ChromaDB con embeddings SentenceTransformer | Reemplazado por `ingest_document()` en `ingest.py`. Usaba `BAAI/bge-m3` local en lugar de la API de OpenAI |
| `09doccluster.py` | Agrupaba documentos por similitud con KMeans | Análisis exploratorio, no conectado a ningún endpoint |
| `rag_router.py` | Routing de consultas + re-ranking avanzado | Nunca se integró a `server.py`. La lógica de routing está reescrita directamente en `detectar_tipo()` dentro de server.py |
| `r09erank.py` | Re-ranking de resultados | Duplicado de `rag_router.py`, tampoco importado por nadie |

---

## Resumen del grafo de dependencias activo

```
server.py
  ├── ingest.py
  │     └── (sin dependencias locales — solo OpenAI, ChromaDB, SQLite)
  └── pdf_reader.py
        └── (sin dependencias locales — solo PyMuPDF, pytesseract)

rebuild_chromadb.py   ← script standalone, sin imports locales
```
