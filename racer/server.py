"""
RACER Smart Cities API
Ejecutar desde la carpeta racer/:
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""
import json, re, sqlite3, time, logging
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, BackgroundTasks, UploadFile, Body
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import chromadb
from chromadb import EmbeddingFunction, Embeddings
import os
from ingest import ingest_document
from pdf_reader import extract_text_from_pdf, _ensure_ocr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenAIEmbeddingFunction(EmbeddingFunction):
    def __init__(self, api_key: str, model_name: str):
        self._openai = OpenAI(api_key=api_key)
        self._model  = model_name

    def __call__(self, input: list[str]) -> Embeddings:
        resp = self._openai.embeddings.create(input=input, model=self._model)
        return [item.embedding for item in resp.data]

load_dotenv()

# Verificar OCR al arrancar
_ocr_ok = _ensure_ocr()
print(f"[RACER] OCR Tesseract: {'✓ disponible' if _ocr_ok else '✗ NO disponible — PDFs escaneados darán 0 chunks'}", flush=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Falta OPENAI_API_KEY en racer/.env")

RUTA_CHROMA = "./08ChromaDB"
RUTA_DB     = "./data/documents.db"
MODELO      = "gpt-4o-mini"
EMBED_MODEL = "text-embedding-3-small"

llm    = OpenAI(api_key=OPENAI_API_KEY)
ef     = OpenAIEmbeddingFunction(api_key=OPENAI_API_KEY, model_name=EMBED_MODEL)
chroma = chromadb.PersistentClient(path=RUTA_CHROMA)
col_chunks = chroma.get_or_create_collection("chunks", embedding_function=ef)
col_docs   = chroma.get_or_create_collection("docs",   embedding_function=ef)

# Ensure data directory and SQLite schema exist
Path("data").mkdir(exist_ok=True)
_init_conn = sqlite3.connect(RUTA_DB)
_init_conn.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        source_file TEXT,
        original_filename TEXT,
        relative_path TEXT,
        doc_type TEXT,
        client TEXT,
        country TEXT,
        is_apostilled INTEGER,
        year INTEGER,
        contract_value_usd REAL,
        contract_duration_years REAL,
        units_deployed INTEGER,
        summary_one_line TEXT,
        language TEXT,
        validity_alert INTEGER,
        project_domain_json TEXT,
        technologies_json TEXT,
        ingested_at TEXT,
        content_hash TEXT
    )
""")
_init_conn.commit()
_init_conn.close()

@contextmanager
def get_db():
    conn = sqlite3.connect(RUTA_DB)

    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

PAISES_MAP = {
    "chile": "Chile", "panamá": "Panamá", "panama": "Panamá",
    "brasil": "Brasil", "brazil": "Brasil", "colombia": "Colombia",
    "guatemala": "Guatemala", "méxico": "México", "mexico": "México",
    "uruguay": "Uruguay", "el salvador": "El Salvador",
    "perú": "Perú", "peru": "Perú", "argentina": "Argentina",
}

def detectar_tipo(q: str) -> str:
    ql = q.lower()
    if any(x in ql for x in ["qué documentos","qué referencias","qué contratos",
                               "qué tenemos","listado","cuáles","todos los"]):
        return "doc"
    if any(x in ql for x in ["cláusula","clausula","monto","valor exacto",
                               "artículo","folio","rut","nit","iva","itbms",
                               "número de contrato","fecha exacta"]):
        return "chunk"
    try:
        r = llm.chat.completions.create(
            model=MODELO, temperature=0,
            messages=[{"role":"user","content":
                f"Clasifica en UNA palabra: doc (visión general/listado) o chunk (dato preciso).\nQuery: {q}"}]
        )
        return "doc" if "doc" in r.choices[0].message.content.lower() else "chunk"
    except Exception:
        return "chunk"

def extraer_filtros(q: str, pais: Optional[str], solo_apostillados: bool) -> dict:
    filtros: dict = {}
    ql = q.lower()
    for key, val in PAISES_MAP.items():
        if key in ql:
            filtros["country"] = val
            break
    if pais:
        filtros["country"] = pais
    if solo_apostillados or "apostillado" in ql:
        filtros["is_apostilled"] = 1
    return filtros

def buscar(pregunta: str, tipo: str, filtros: dict, n: int = 8) -> list:
    col    = col_docs if tipo == "doc" else col_chunks
    kwargs: dict = dict(query_texts=[pregunta], n_results=min(n, col.count()),
                        include=["documents","metadatas","distances"])
    if filtros:
        kwargs["where"] = filtros
    try:
        r = col.query(**kwargs)
    except Exception:
        kwargs.pop("where", None)
        r = col.query(**kwargs)
    items = []
    for i in range(len(r["ids"][0])):
        items.append({"id": r["ids"][0][i], "text": r["documents"][0][i],
                      "meta": r["metadatas"][0][i], "distance": r["distances"][0][i]})
    return items

def construir_contexto(items: list) -> str:
    bloques = []
    for it in items:
        m = it["meta"]
        enc = " | ".join(filter(None,[
            m.get("source_file",""), m.get("country",""),
            f"año {m.get('year','')}" if m.get("year") else None,
            "APOSTILLADO" if m.get("is_apostilled") == 1 else None,
        ]))
        bloques.append(f"[{enc}]\n{it['text']}")
    return "\n\n".join(bloques)

SYSTEM_PROMPT = """Eres SONDA Smart Cities Assistant, agente de IA del equipo de Tecnologías Disruptivas de SONDA. Asistes a Key Account Managers (KAM) e ingenieros de preventa del área de Smart Cities.

Tu propósito: facilitar la búsqueda, análisis y reutilización de documentos del repositorio de Smart Cities para acelerar la preparación de propuestas comerciales, técnicas y respuestas a licitaciones.

CONTEXTO
Smart Cities implementa soluciones de transporte público, sistemas de recaudo, gestión de flotas, semáforos inteligentes, peajes y movilidad urbana en Chile, Panamá, Brasil, Guatemala, El Salvador, México, Colombia y Uruguay.

REPOSITORIO — tipos de documentos:
- Certificados de experiencia: acreditan que SONDA ejecutó un proyecto. Fundamentales para licitaciones. Algunos están apostillados (válidos internacionalmente).
- Cartas de referencia y recomendación: fortalecen propuestas comerciales.
- Certificaciones comerciales: acreditan relaciones comerciales, generalmente apostilladas.
- Constancias de conformidad: certifican ejecución satisfactoria de un servicio.
- Contratos y adendas: evidencian la relación contractual formal con montos y plazos.

COMPORTAMIENTO
- Responde siempre en español. Si un documento está en portugués, traduce o resume.
- Sé directo. Los usuarios necesitan respuestas rápidas y accionables.
- Siempre cita la fuente. Ejemplo: \"Según el Certificado Metro Panamá (apostillado), SONDA implementó el sistema de recaudo desde 2011.\"
- Si no tienes la información, responde: \"No encontré esa información en los documentos disponibles.\"
- Cuando haya múltiples resultados, usa tabla Markdown con columnas: Cliente | País | Documento | Apostillado | Año
- Distingue apostillados de no apostillados. Para licitaciones internacionales, prioriza los apostillados.
- Si un documento tiene más de 3 años, indica \"(revisar vigencia)\".
- Si existen múltiples versiones de un documento (v1, v2), menciona ambas y sugiere la más reciente.
- Sé proactivo: si detectas información relacionada útil, ofrécela.

REGLAS CRÍTICAS
- NUNCA inventes experiencias, montos, fechas o clientes. Información falsa puede descalificar a SONDA en licitaciones.
- Responde SOLO con información del contexto proporcionado.
- Prioriza documentos apostillados para licitaciones internacionales.
- Ante preguntas ambiguas, clarifica antes de responder.
- Los datos son de uso interno de SONDA exclusivamente."""

class ConversationMessage(BaseModel):
    role:    str  # "user" or "assistant"
    content: str

class QueryRequest(BaseModel):
    question:          str
    pais:              Optional[str] = None
    solo_apostillados: bool          = False
    ano_desde:         Optional[int] = None
    conversation_id:   Optional[str] = None
    history:           list[ConversationMessage] = []

class RFPRequest(BaseModel):
    rfp_text: str

class Source(BaseModel):
    archivo:     str
    pais:        str
    ano:         str
    apostillado: bool
    distancia:   float

class QueryResponse(BaseModel):
    answer:  str
    sources: list[Source]
    tipo:    str
    filtros: dict

class RFPRow(BaseModel):
    id:        str
    requisito: str
    estado:    str
    evidencia: str

class RFPResponse(BaseModel):
    total:      int
    requisitos: list[RFPRow]

class IngestRequest(BaseModel):
    text:        str
    filename:    str
    document_id: Optional[str] = None

class IngestResponse(BaseModel):
    document_id:  str
    chunks_added: int
    metadata:     dict
    status:       str

class ReMetadataRequest(BaseModel):
    document_id: str

app = FastAPI(title="RACER Smart Cities API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "chunks": col_chunks.count(), "docs": col_docs.count()}

@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(400, "Pregunta vacía")

    # Build a context-enriched query string using recent conversation history.
    # This lets filter extraction and vector search resolve follow-up questions
    # that lack explicit context (e.g. "¿cuáles son apostillados?" after asking about Guatemala).
    if req.history:
        history_text = "\n".join(
            f"{'Usuario' if m.role == 'user' else 'Asistente'}: {m.content[:300]}"
            for m in req.history[-4:]
        )
        enriched_q = f"{history_text}\nUsuario: {req.question}"
    else:
        enriched_q = req.question

    tipo    = detectar_tipo(req.question)
    filtros = extraer_filtros(enriched_q, req.pais, req.solo_apostillados)
    items   = buscar(enriched_q, tipo, filtros, n=8)
    if req.ano_desde:
        items = [x for x in items if (x["meta"].get("year") or 0) >= req.ano_desde]
    if not items:
        return QueryResponse(answer="No encontré documentos que coincidan.",
                             sources=[], tipo=tipo, filtros=filtros)
    contexto = construir_contexto(items)

    # Include conversation history in the LLM call so the assistant can give
    # coherent follow-up answers without losing thread.
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.history[-6:]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": f"Pregunta: {req.question}\n\nContexto documental:\n{contexto}"})

    r = llm.chat.completions.create(model=MODELO, temperature=0, messages=messages)
    sources = [Source(
        archivo=x["meta"].get("source_file",""),
        pais=x["meta"].get("country",""),
        ano=str(x["meta"].get("year","") or ""),
        apostillado=x["meta"].get("is_apostilled") == 1,
        distancia=round(x["distance"], 4),
    ) for x in items]
    return QueryResponse(answer=r.choices[0].message.content,
                         sources=sources, tipo=tipo, filtros=filtros)

@app.post("/rfp", response_model=RFPResponse)
def check_rfp(req: RFPRequest):
    if not req.rfp_text.strip():
        raise HTTPException(400, "RFP vacío")
    r = llm.chat.completions.create(
        model=MODELO, temperature=0,
        response_format={"type": "json_object"},
        messages=[{"role":"user","content":f"""
Extrae los requisitos habilitantes de esta licitación.
Devuelve JSON con esta estructura exacta:
{{"requisitos":[{{"id":"R1","texto":"descripción corta del requisito en máx 80 chars","dominio":"área técnica"}}]}}

Licitación:
{req.rfp_text}
"""}])
    try:
        requisitos = json.loads(r.choices[0].message.content).get("requisitos", [])
    except Exception:
        raise HTTPException(500, "No se pudieron parsear los requisitos")

    resultados = []
    for req_item in requisitos:
        items    = buscar(req_item["texto"], tipo="chunk", filtros={}, n=5)
        contexto = construir_contexto(items) if items else "Sin documentos encontrados."
        ev = llm.chat.completions.create(
            model=MODELO, temperature=0,
            response_format={"type": "json_object"},
            messages=[{"role":"user","content":f"""
Evalúa si el contexto demuestra que SONDA cumple este requisito habilitante.
Responde SOLO con JSON: {{"estado":"CUMPLE","evidencia":"qué documento lo acredita (máx 100 chars)"}}
El campo estado debe ser exactamente: CUMPLE, PARCIAL o NO_CUMPLE.

Requisito: {req_item["texto"]}

Contexto documental:
{contexto}
"""}])
        try:
            ev_data   = json.loads(ev.choices[0].message.content)
            estado    = ev_data.get("estado", "NO_CUMPLE")
            evidencia = ev_data.get("evidencia", "")[:100]
        except Exception:
            estado, evidencia = "NO_CUMPLE", "Error al evaluar"

        resultados.append(RFPRow(id=req_item.get("id","R?"),
                                  requisito=req_item["texto"][:80],
                                  estado=estado, evidencia=evidencia))
        time.sleep(0.2)

    return RFPResponse(total=len(resultados), requisitos=resultados)

@app.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest):
    if not req.text.strip():
        raise HTTPException(400, "Texto vacío")
    try:
        result = ingest_document(
            text=req.text,
            filename=req.filename,
            col_chunks=col_chunks,
            col_docs=col_docs,
            db_path=RUTA_DB,
            llm=llm,
            modelo=MODELO,
            ruta_chunks_jsonl=Path("data/chunks.jsonl"),
            ruta_metadata_jsonl=Path("data/metadata.jsonl"),
            document_id=req.document_id,
        )
        return IngestResponse(status="ok", **result)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/ingest/pdf")
async def ingest_pdf(file: UploadFile = File(...), document_id: str | None = None):
    """Acepta un PDF via multipart, extrae texto con PyMuPDF + OCR, e ingesta."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Se requiere un archivo PDF")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Archivo vacío")

    text = extract_text_from_pdf(file_bytes, file.filename)
    if not text.strip():
        return {"status": "empty", "document_id": document_id or "",
                "chunks_added": 0, "metadata": {},
                "message": "No se pudo extraer texto del PDF"}
    try:
        result = ingest_document(
            text=text,
            filename=file.filename,
            col_chunks=col_chunks,
            col_docs=col_docs,
            db_path=RUTA_DB,
            llm=llm,
            modelo=MODELO,
            ruta_chunks_jsonl=Path("data/chunks.jsonl"),
            ruta_metadata_jsonl=Path("data/metadata.jsonl"),
            document_id=document_id,
        )
        return {"status": result.get("status", "ok"), **result}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/ingest/stats")
def ingest_stats():
    return {
        "chunks": col_chunks.count(),
        "docs":   col_docs.count(),
    }

@app.get("/documents")
def list_documents():
    """Lista todos los documentos indexados desde SQLite."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT document_id, source_file AS original_filename, doc_type, client, country, year, "
            "is_apostilled, summary_one_line, ingested_at FROM documents ORDER BY ingested_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def _delete_document(doc_id: str):
    """Elimina un documento de ChromaDB (chunks + doc) y SQLite."""
    try:
        old_chunks = col_chunks.get(where={"document_id": doc_id})
        if old_chunks["ids"]:
            col_chunks.delete(ids=old_chunks["ids"])
    except Exception:
        pass
    try:
        if col_docs.get(ids=[doc_id])["ids"]:
            col_docs.delete(ids=[doc_id])
    except Exception:
        pass
    with get_db() as conn:
        conn.execute("DELETE FROM documents WHERE document_id = ?", (doc_id,))
        conn.commit()


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    """Elimina un documento por ID."""
    _delete_document(doc_id)
    return {"ok": True, "deleted": doc_id}


@app.delete("/documents")
def delete_documents(ids: List[str] = Body(..., embed=True)):
    """Elimina múltiples documentos por lista de IDs."""
    for doc_id in ids:
        _delete_document(doc_id)
    return {"ok": True, "deleted": len(ids)}


@app.delete("/documents/all/confirm")
def delete_all_documents(password: str = Body(..., embed=True)):
    """Elimina TODOS los documentos. Requiere contraseña 'borrar todo'."""
    if password != "borrar todo":
        raise HTTPException(403, "Contraseña incorrecta")
    with get_db() as conn:
        doc_ids = [r[0] for r in conn.execute("SELECT document_id FROM documents").fetchall()]
    for doc_id in doc_ids:
        _delete_document(doc_id)
    return {"ok": True, "deleted": len(doc_ids)}


@app.post("/reingest/metadata")
def reingest_metadata(req: ReMetadataRequest):
    """Re-extract metadata for a document that failed during initial ingestion.
    Reconstructs the original text from existing ChromaDB chunks and re-runs the LLM."""
    from ingest import extract_metadata, _safe_meta

    # 1 — Leer chunks existentes de ChromaDB
    results = col_chunks.get(
        where={"document_id": req.document_id},
        include=["documents", "metadatas"],
    )
    if not results["ids"]:
        raise HTTPException(404, f"No se encontraron chunks para '{req.document_id}'")

    # 2 — Reconstruir texto ordenando por chunk_index
    pairs = sorted(
        zip(results["documents"], results["metadatas"]),
        key=lambda x: x[1].get("chunk_index", 0),
    )
    full_text   = "\n".join(doc for doc, _ in pairs)
    source_file = results["metadatas"][0].get("source_file", req.document_id)

    # 3 — Re-extraer metadata con el LLM
    meta = extract_metadata(full_text, source_file, llm, MODELO)
    summary = meta.get("summary_one_line", "")
    if summary.startswith("No se pudo procesar") or summary.startswith("Error al procesar"):
        raise HTTPException(500, f"La extracción de metadata falló de nuevo: {summary}")

    # 4 — Actualizar colección docs en ChromaDB (upsert)
    texto_doc = "\n".join(filter(None, [
        f"ARCHIVO: {source_file}",
        f"TIPO: {meta.get('doc_type','')}",
        f"CLIENTE: {meta.get('client','')}",
        f"PAIS: {meta.get('country','')}",
        f"APOSTILLADO: {'Sí' if meta.get('is_apostilled') else 'No'}",
        f"AÑO: {meta.get('year','')}",
        f"DOMINIOS: {', '.join(meta.get('project_domain') or [])}",
        f"RESUMEN: {meta.get('summary_one_line','')}",
    ]))
    new_doc_meta = {
        "document_id":     req.document_id,
        "source_file":     _safe_meta(source_file),
        "doc_type":        _safe_meta(meta.get("doc_type")),
        "client":          _safe_meta(meta.get("client")),
        "country":         _safe_meta(meta.get("country")),
        "is_apostilled":   1 if meta.get("is_apostilled") is True else (-1 if meta.get("is_apostilled") is None else 0),
        "year":            meta.get("year") or 0,
        "project_domain":  _safe_meta(meta.get("project_domain")),
        "validity_alert":  1 if meta.get("validity_alert") else 0,
        "summary_one_line": _safe_meta(meta.get("summary_one_line")),
        "language":        _safe_meta(meta.get("language")),
    }
    if col_docs.get(ids=[req.document_id])["ids"]:
        col_docs.update(ids=[req.document_id], documents=[texto_doc], metadatas=[new_doc_meta])
    else:
        col_docs.add(ids=[req.document_id], documents=[texto_doc], metadatas=[new_doc_meta])

    # 5 — Actualizar metadata de chunks en ChromaDB
    chunk_update_metas = []
    for m in results["metadatas"]:
        um = dict(m)
        um.update({
            "doc_type":        _safe_meta(meta.get("doc_type")),
            "client":          _safe_meta(meta.get("client")),
            "country":         _safe_meta(meta.get("country")),
            "is_apostilled":   1 if meta.get("is_apostilled") is True else (-1 if meta.get("is_apostilled") is None else 0),
            "year":            meta.get("year") or 0,
            "project_domain":  _safe_meta(meta.get("project_domain")),
            "validity_alert":  1 if meta.get("validity_alert") else 0,
            "summary_one_line": _safe_meta(meta.get("summary_one_line")),
        })
        chunk_update_metas.append(um)
    col_chunks.update(ids=results["ids"], metadatas=chunk_update_metas)

    # 6 — Actualizar SQLite
    def _b(v): return 1 if v is True else (0 if v is False else None)
    def _i(v):
        try: return int(v)
        except: return None
    def _f(v):
        try: return float(v)
        except: return None

    with get_db() as conn:
        conn.execute("""
            UPDATE documents SET
                doc_type=?, client=?, country=?, is_apostilled=?, year=?,
                contract_value_usd=?, contract_duration_years=?, units_deployed=?,
                summary_one_line=?, language=?, validity_alert=?,
                project_domain_json=?, technologies_json=?
            WHERE document_id=?
        """, (
            str(meta.get("doc_type", "") or ""),
            str(meta.get("client", "") or "") or None,
            str(meta.get("country", "") or "") or None,
            _b(meta.get("is_apostilled")),
            _i(meta.get("year")),
            _f(meta.get("contract_value_usd")),
            _f(meta.get("contract_duration_years")),
            _i(meta.get("units_deployed")),
            str(meta.get("summary_one_line", "") or ""),
            str(meta.get("language", "") or ""),
            _b(meta.get("validity_alert", False)),
            json.dumps(meta.get("project_domain") or [], ensure_ascii=False),
            json.dumps(meta.get("technologies") or [], ensure_ascii=False),
            req.document_id,
        ))

    # 7 — Reemplazar línea en metadata.jsonl
    ruta_meta = Path("data/metadata.jsonl")
    if ruta_meta.exists():
        nuevo_reg = {"document_id": req.document_id, "source_file": source_file, **meta}
        lines = ruta_meta.read_text(encoding="utf-8").splitlines()
        new_lines, updated = [], False
        for line in lines:
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
                if obj.get("document_id") == req.document_id:
                    new_lines.append(json.dumps(nuevo_reg, ensure_ascii=False))
                    updated = True
                else:
                    new_lines.append(line)
            except Exception:
                new_lines.append(line)
        if not updated:
            new_lines.append(json.dumps(nuevo_reg, ensure_ascii=False))
        ruta_meta.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

    return {"status": "ok", "document_id": req.document_id, "metadata": meta}
