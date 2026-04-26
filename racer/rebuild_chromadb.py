"""
rebuild_chromadb.py
Ejecutar desde la carpeta racer/:
    python rebuild_chromadb.py
"""
import json, sqlite3, time
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Falta OPENAI_API_KEY en .env")

import chromadb
from chromadb import EmbeddingFunction, Embeddings
import openai as _openai

class OpenAIEmbeddingFunction(EmbeddingFunction):
    def __init__(self, api_key: str, model_name: str):
        self._client = _openai.OpenAI(api_key=api_key)
        self._model  = model_name

    def __call__(self, input: list[str]) -> Embeddings:
        resp = self._client.embeddings.create(input=input, model=self._model)
        return [item.embedding for item in resp.data]

RUTA_METADATA = Path("data/metadata.jsonl")
RUTA_CHUNKS   = Path("data/chunks.jsonl")
RUTA_DB       = Path("data/documents.db")
RUTA_CHROMA   = Path("08ChromaDB")
EMBED_MODEL   = "text-embedding-3-small"
BATCH_SIZE    = 50

def safe_meta(val, default=""):
    if val is None:           return default
    if isinstance(val, list): return ", ".join(str(x) for x in val)
    if isinstance(val, bool): return int(val)
    return val

print("Construyendo SQLite...")
if RUTA_DB.exists():
    RUTA_DB.unlink()

conn = sqlite3.connect(str(RUTA_DB))
conn.executescript("""
    CREATE TABLE documents (
        document_id TEXT PRIMARY KEY, source_file TEXT, relative_path TEXT,
        source_path TEXT, doc_type TEXT, client TEXT, country TEXT,
        is_apostilled INTEGER, year INTEGER, contract_value_usd REAL,
        contract_duration_years REAL, units_deployed INTEGER,
        summary_one_line TEXT, language TEXT, validity_alert INTEGER,
        project_domain_json TEXT, technologies_json TEXT, ingested_at TEXT
    );
    CREATE INDEX idx_country    ON documents(country);
    CREATE INDEX idx_doc_type   ON documents(doc_type);
    CREATE INDEX idx_apostilled ON documents(is_apostilled);
    CREATE INDEX idx_year       ON documents(year);
""")

def sb(v):
    if v is True: return 1
    if v is False: return 0
    return None

def si(v):
    try: return int(v)
    except: return None

def sf(v):
    try: return float(v)
    except: return None

with open(RUTA_METADATA, "r", encoding="utf-8") as f:
    for line in f:
        try: obj = json.loads(line)
        except: continue
        doc_id = str(obj.get("document_id", "") or "")
        if not doc_id: continue
        pd = obj.get("project_domain", [])
        te = obj.get("technologies", [])
        conn.execute("INSERT OR REPLACE INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            doc_id, str(obj.get("source_file","") or ""), str(obj.get("relative_path","") or ""),
            str(obj.get("source_path","") or ""), str(obj.get("doc_type","") or ""),
            str(obj.get("client","") or "") or None, str(obj.get("country","") or "") or None,
            sb(obj.get("is_apostilled")), si(obj.get("year")), sf(obj.get("contract_value_usd")),
            sf(obj.get("contract_duration_years")), si(obj.get("units_deployed")),
            str(obj.get("summary_one_line","") or ""), str(obj.get("language","") or ""),
            sb(obj.get("validity_alert", False)),
            json.dumps(pd if isinstance(pd, list) else [], ensure_ascii=False),
            json.dumps(te if isinstance(te, list) else [], ensure_ascii=False),
            str(obj.get("ingested_at","") or ""),
        ))

conn.commit()
conn.close()
print(f"SQLite OK -> {RUTA_DB}")

print("\nConstruyendo ChromaDB (puede tardar varios minutos)...")
ef     = OpenAIEmbeddingFunction(api_key=OPENAI_API_KEY, model_name=EMBED_MODEL)
chroma = chromadb.PersistentClient(path=str(RUTA_CHROMA))

for name in ["chunks", "docs"]:
    try: chroma.delete_collection(name)
    except: pass

col_chunks = chroma.get_or_create_collection("chunks", embedding_function=ef, metadata={"hnsw:space":"cosine"})
col_docs   = chroma.get_or_create_collection("docs",   embedding_function=ef, metadata={"hnsw:space":"cosine"})

def add_batch(col, ids, docs, metas):
    if not ids: return 0
    col.add(ids=ids, documents=docs, metadatas=metas)
    return len(ids)

ids_b, docs_b, metas_b, total = [], [], [], 0
with open(RUTA_CHUNKS, "r", encoding="utf-8") as f:
    for line in f:
        try: obj = json.loads(line)
        except: continue
        ids_b.append(str(obj["chunk_id"]))
        docs_b.append(str(obj["text"]))
        metas_b.append({
            "document_id": safe_meta(obj.get("document_id")),
            "source_file": safe_meta(obj.get("source_file")),
            "page_start":  safe_meta(obj.get("page_start"), 0),
            "page_end":    safe_meta(obj.get("page_end"),   0),
            "chunk_index": safe_meta(obj.get("chunk_index"), 0),
            "doc_type":    safe_meta(obj.get("doc_type")),
            "client":      safe_meta(obj.get("client")),
            "country":     safe_meta(obj.get("country")),
            "is_apostilled": safe_meta(obj.get("is_apostilled"), -1),
            "year":        safe_meta(obj.get("year"), 0),
            "project_domain": safe_meta(obj.get("project_domain")),
            "validity_alert": safe_meta(obj.get("validity_alert"), 0),
            "summary_one_line": safe_meta(obj.get("summary_one_line")),
        })
        if len(ids_b) == BATCH_SIZE:
            total += add_batch(col_chunks, ids_b, docs_b, metas_b)
            ids_b, docs_b, metas_b = [], [], []
            print(f"  chunks: {total}", end="\r")
            time.sleep(0.5)
if ids_b:
    total += add_batch(col_chunks, ids_b, docs_b, metas_b)

print(f"\nChunks cargados: {col_chunks.count()}")

ids_b, docs_b, metas_b = [], [], []
with open(RUTA_METADATA, "r", encoding="utf-8") as f:
    for line in f:
        try: obj = json.loads(line)
        except: continue
        doc_id = str(obj.get("document_id","") or "")
        if not doc_id: continue
        texto = "\n".join(filter(None,[
            f"ARCHIVO: {obj.get('source_file','')}",
            f"TIPO: {obj.get('doc_type','')}",
            f"CLIENTE: {obj.get('client','')}",
            f"PAIS: {obj.get('country','')}",
            f"APOSTILLADO: {'Si' if obj.get('is_apostilled') else 'No'}",
            f"ANO: {obj.get('year','')}",
            f"DOMINIOS: {', '.join(obj.get('project_domain') or [])}",
            f"RESUMEN: {obj.get('summary_one_line','')}",
        ]))
        ids_b.append(doc_id)
        docs_b.append(texto)
        metas_b.append({
            "document_id":  doc_id,
            "source_file":  safe_meta(obj.get("source_file")),
            "doc_type":     safe_meta(obj.get("doc_type")),
            "client":       safe_meta(obj.get("client")),
            "country":      safe_meta(obj.get("country")),
            "is_apostilled": safe_meta(obj.get("is_apostilled"), -1),
            "year":         safe_meta(obj.get("year"), 0),
            "project_domain": safe_meta(obj.get("project_domain")),
            "validity_alert": safe_meta(obj.get("validity_alert"), 0),
            "summary_one_line": safe_meta(obj.get("summary_one_line")),
            "language":     safe_meta(obj.get("language")),
        })
        if len(ids_b) == BATCH_SIZE:
            add_batch(col_docs, ids_b, docs_b, metas_b)
            ids_b, docs_b, metas_b = [], [], []
            time.sleep(0.5)
if ids_b:
    add_batch(col_docs, ids_b, docs_b, metas_b)

print(f"Docs cargados: {col_docs.count()}")
print("\nChromaDB lista en 08ChromaDB/")
print("SQLite lista en data/documents.db")
print('\nAhora puedes arrancar el servidor: uvicorn server:app --port 8000 --reload')