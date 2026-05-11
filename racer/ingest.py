"""
ingest.py — Pipeline de ingesta de documentos para RACER
Flujo: texto → chunks → metadata (GPT-4o-mini) → ChromaDB + SQLite + JSONL
"""
import json, re, sqlite3, hashlib
from pathlib import Path
from datetime import datetime
from openai import OpenAI

MAX_CHARS   = 2200
MIN_CHARS   = 250
OVERLAP     = 180
MAX_CONTEXT = 12000
AÑO_ACTUAL  = datetime.now().year


def _id_from_filename(filename: str) -> str:
    stem  = Path(filename).stem
    clean = re.sub(r"[^a-z0-9]", "_", stem.lower())[:60]
    return clean or hashlib.md5(filename.encode()).hexdigest()[:16]


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


def _ensure_hash_column(conn: sqlite3.Connection):
    try:
        conn.execute("ALTER TABLE documents ADD COLUMN content_hash TEXT")
        conn.commit()
    except Exception:
        pass  # column already exists


def check_duplicate(text: str, db_path: str) -> str | None:
    """Devuelve el document_id existente si el contenido ya fue ingestado, o None."""
    h = _content_hash(text)
    conn = sqlite3.connect(db_path)
    try:
        _ensure_hash_column(conn)
        row = conn.execute(
            "SELECT document_id FROM documents WHERE content_hash = ?", (h,)
        ).fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def _safe_meta(val, default=""):
    if val is None:              return default
    if isinstance(val, list):    return ", ".join(str(x) for x in val)
    if isinstance(val, bool):    return int(val)
    return val


# ── Chunking ────────────────────────────────────────────────────────────────────────────

def chunk_text(text: str, document_id: str, source_file: str) -> list[dict]:
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text).strip()

    chunks, idx, cursor = [], 0, 0
    while cursor < len(text):
        end      = min(len(text), cursor + MAX_CHARS)
        fragment = text[cursor:end].strip()
        if len(fragment) >= MIN_CHARS:
            chunks.append({
                "chunk_id":    f"{document_id}__c{idx}",
                "document_id": document_id,
                "source_file": source_file,
                "chunk_index": idx,
                "page_start":  0,
                "page_end":    0,
                "char_count":  len(fragment),
                "text":        fragment,
                "ingested_at": datetime.now().isoformat(),
            })
            idx += 1
        if end >= len(text):
            break
        cursor = max(end - OVERLAP, cursor + 1)
    return chunks


# ── Extracción de metadata via LLM ──────────────────────────────────────────────────────

_PROMPT_SISTEMA = """Eres experto en análisis de documentos corporativos de tecnología.
Extraes metadatos de contratos, certificados, cartas de referencia y licitaciones.
Responde SOLO con JSON válido, sin markdown ni texto adicional."""

_PROMPT_META = """Analiza el documento y devuelve JSON con esta estructura exacta.
Usa null si no puedes determinarlo con certeza. No inventes datos.

{{
  "doc_type": uno de ["certificado_experiencia","contrato","adenda","carta_referencia",
                       "constancia_conformidad","certificacion_comercial","excel_datos","otro"],
  "client": "nombre del cliente o null",
  "country": "país en español (Chile, Panamá, Brasil...) o null",
  "project_domain": ["dominios aplicables de: recaudo,flotas,semaforos,peajes,iluminacion,
                      movilidad,cloud,ti,medios_de_pago,gestion_municipal,ambiental,otro"],
  "is_apostilled": true/false/null,
  "year": año entero o null,
  "contract_value_usd": número en USD o null,
  "contract_duration_years": duración en años o null,
  "technologies": ["tecnologías mencionadas: EMV, contactless, GTFS, etc."],
  "units_deployed": entero de unidades instaladas o null,
  "summary_one_line": "una oración que resuma el documento",
  "language": uno de ["es","pt","en","otro"],
  "validity_alert": true si el documento tiene más de 3 años, false si no
}}

Archivo: {filename}
Contenido:
{text}"""


def extract_metadata(text: str, filename: str, llm: OpenAI, modelo: str) -> dict:
    try:
        r = llm.chat.completions.create(
            model=modelo, temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _PROMPT_SISTEMA},
                {"role": "user",   "content": _PROMPT_META.format(
                    filename=filename,
                    text=text[:MAX_CONTEXT],
                )},
            ],
        )
        meta = json.loads(r.choices[0].message.content)
        year = meta.get("year")
        if isinstance(year, int):
            meta["validity_alert"] = (AÑO_ACTUAL - year) > 3
        return meta
    except Exception as e:
        return {
            "doc_type": "otro", "client": None, "country": None,
            "project_domain": [], "is_apostilled": None, "year": None,
            "contract_value_usd": None, "contract_duration_years": None,
            "technologies": [], "units_deployed": None,
            "summary_one_line": f"Error al procesar: {filename} — {str(e)[:80]}",
            "language": None, "validity_alert": False,
        }


# ── Pipeline principal ────────────────────────────────────────────────────────────────────────────

def ingest_document(
    *,
    text: str,
    filename: str,
    col_chunks,
    col_docs,
    db_path: str,
    llm: OpenAI,
    modelo: str,
    ruta_chunks_jsonl: Path,
    ruta_metadata_jsonl: Path,
    document_id: str | None = None,
) -> dict:
    """
    Pipeline completo: texto → chunks → metadata → ChromaDB + SQLite + JSONL.
    Retorna {document_id, chunks_added, metadata}.
    """
    doc_id = document_id or _id_from_filename(filename)
    text_hash = _content_hash(text)

    # 0 — Deduplicación por contenido
    existing_id = check_duplicate(text, db_path)
    if existing_id and existing_id != doc_id:
        return {
            "document_id":  doc_id,
            "chunks_added": 0,
            "metadata":     {},
            "status":       "duplicate",
            "duplicate_of": existing_id,
        }

    # 1 — Metadata
    metadata = extract_metadata(text, filename, llm, modelo)

    # 2 — Chunks
    chunks = chunk_text(text, doc_id, filename)
    if not chunks:
        return {"document_id": doc_id, "chunks_added": 0, "metadata": metadata}

    # 3 — ChromaDB: eliminar chunks viejos del mismo documento y agregar los nuevos
    try:
        old = col_chunks.get(where={"document_id": doc_id})
        if old["ids"]:
            col_chunks.delete(ids=old["ids"])
    except Exception:
        pass
    nuevos = chunks

    def _chunk_meta(c: dict) -> dict:
        return {
            "document_id":      c["document_id"],
            "source_file":      c["source_file"],
            "page_start":       c["page_start"],
            "page_end":         c["page_end"],
            "chunk_index":      c["chunk_index"],
            "doc_type":         _safe_meta(metadata.get("doc_type")),
            "client":           _safe_meta(metadata.get("client")),
            "country":          _safe_meta(metadata.get("country")),
            "is_apostilled":    1 if metadata.get("is_apostilled") is True
                                else (-1 if metadata.get("is_apostilled") is None else 0),
            "year":             metadata.get("year") or 0,
            "project_domain":   _safe_meta(metadata.get("project_domain")),
            "validity_alert":   1 if metadata.get("validity_alert") else 0,
            "summary_one_line": _safe_meta(metadata.get("summary_one_line")),
        }

    if nuevos:
        col_chunks.add(
            ids=[c["chunk_id"] for c in nuevos],
            documents=[c["text"] for c in nuevos],
            metadatas=[_chunk_meta(c) for c in nuevos],
        )

    # 4 — ChromaDB: colección docs
    texto_doc = "\n".join(filter(None, [
        f"ARCHIVO: {filename}",
        f"TIPO: {metadata.get('doc_type','')}",
        f"CLIENTE: {metadata.get('client','')}",
        f"PAIS: {metadata.get('country','')}",
        f"APOSTILLADO: {'Sí' if metadata.get('is_apostilled') else 'No'}",
        f"AÑO: {metadata.get('year','')}",
        f"DOMINIOS: {', '.join(metadata.get('project_domain') or [])}",
        f"RESUMEN: {metadata.get('summary_one_line','')}",
    ]))
    if not col_docs.get(ids=[doc_id])["ids"]:
        col_docs.add(
            ids=[doc_id],
            documents=[texto_doc],
            metadatas=[{
                "document_id":    doc_id,
                "source_file":    _safe_meta(filename),
                "doc_type":       _safe_meta(metadata.get("doc_type")),
                "client":         _safe_meta(metadata.get("client")),
                "country":        _safe_meta(metadata.get("country")),
                "is_apostilled":  1 if metadata.get("is_apostilled") is True
                                  else (-1 if metadata.get("is_apostilled") is None else 0),
                "year":           metadata.get("year") or 0,
                "project_domain": _safe_meta(metadata.get("project_domain")),
                "validity_alert": 1 if metadata.get("validity_alert") else 0,
                "summary_one_line": _safe_meta(metadata.get("summary_one_line")),
                "language":       _safe_meta(metadata.get("language")),
            }],
        )

    # 5 — SQLite
    def _b(v): return 1 if v is True else (0 if v is False else None)
    def _i(v):
        try: return int(v)
        except: return None
    def _f(v):
        try: return float(v)
        except: return None

    conn = sqlite3.connect(db_path)
    try:
        _ensure_hash_column(conn)
        conn.execute(
            "INSERT OR REPLACE INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                doc_id, filename, filename, "",
                str(metadata.get("doc_type", "") or ""),
                str(metadata.get("client", "") or "") or None,
                str(metadata.get("country", "") or "") or None,
                _b(metadata.get("is_apostilled")),
                _i(metadata.get("year")),
                _f(metadata.get("contract_value_usd")),
                _f(metadata.get("contract_duration_years")),
                _i(metadata.get("units_deployed")),
                str(metadata.get("summary_one_line", "") or ""),
                str(metadata.get("language", "") or ""),
                _b(metadata.get("validity_alert", False)),
                json.dumps(metadata.get("project_domain") or [], ensure_ascii=False),
                json.dumps(metadata.get("technologies") or [], ensure_ascii=False),
                datetime.now().isoformat(),
                text_hash,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    # 6 — Append JSONL (backup/auditoría)
    registro_meta = {
        "document_id": doc_id,
        "source_file": filename,
        "ingested_at": datetime.now().isoformat(),
        **metadata,
    }
    with open(ruta_metadata_jsonl, "a", encoding="utf-8") as f:
        f.write(json.dumps(registro_meta, ensure_ascii=False) + "\n")

    for chunk in nuevos:
        full_chunk = {**chunk, **{k: metadata.get(k) for k in [
            "doc_type","client","country","is_apostilled","year",
            "project_domain","validity_alert","summary_one_line",
        ]}}
        with open(ruta_chunks_jsonl, "a", encoding="utf-8") as f:
            f.write(json.dumps(full_chunk, ensure_ascii=False) + "\n")

    return {
        "document_id":  doc_id,
        "chunks_added": len(nuevos),
        "metadata":     metadata,
        "status":       "ok",
    }
