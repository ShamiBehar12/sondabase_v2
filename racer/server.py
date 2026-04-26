from sentence_transformers import CrossEncoder
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

print("Cargando BGE reranker...")
bge_model = CrossEncoder("BAAI/bge-reranker-v2-m3")
print("BGE listo")

import os
import re
import time
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import chromadb
from openai import OpenAI
from dotenv import load_dotenv

from r09erank import rerank_results, _normalize, _tokenize
from rag_router import detect_query_type

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════
CLUSTERS_PATH = "./09Clusters/doc_clusters.jsonl"
CLUSTER_BOOST = 0.18
CHROMA_PATH = "./08ChromaDB"
COLLECTION_CHUNKS = "documentos_rag"
COLLECTION_DOCS = "documentos_rag_docs"
EMBED_MODEL = "BAAI/bge-m3"
RERANK_MODEL = "BAAI/bge-reranker-v2-m3"
MODEL_NAME = "gpt-4o-mini"
DB_PATH = "./racer_history.db"

N_RESULTS_CHUNKS_RAW = 30
N_RESULTS_DOCS_RAW = 15
TOP_CHUNKS_AFTER_RERANK = 6
TOP_DOCS_AFTER_RERANK = 4
MAX_COMBINED_ITEMS = 8
KEYWORD_TOP_K = 4

MAX_RECENT_MESSAGES = 8
MAX_RAW_HISTORY_CHARS = 6000
SUMMARY_TRIGGER_CHARS = 9000
SUMMARY_KEEP_LAST_N = 6

# ═══════════════════════════════════════════════════════════════════════════════
# INIT
# ═══════════════════════════════════════════════════════════════════════════════

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("No se encontró OPENAI_API_KEY en .env")

llm = OpenAI(api_key=api_key)

embedding_fn = SentenceTransformerEmbeddingFunction(
    model_name=EMBED_MODEL
)

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
chunks_collection = chroma_client.get_collection(
    name=COLLECTION_CHUNKS,
    embedding_function=embedding_fn,
)
docs_collection = chroma_client.get_collection(
    name=COLLECTION_DOCS,
    embedding_function=embedding_fn,
)

# ═══════════════════════════════════════════════════════════════════════════════
# SQLITE
# ═══════════════════════════════════════════════════════════════════════════════

def init_db():
    with _db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL DEFAULT 'Nueva conversación',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS conversation_memory (
                conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
                summary_text TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS messages (
                id              TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
                content         TEXT NOT NULL,
                sources_json    TEXT,
                created_at      TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);
        """)

@contextmanager
def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

# ═══════════════════════════════════════════════════════════════════════════════
# VENTANA CONTEXTUAL DE MENSAJES
# ═══════════════════════════════════════════════════════════════════════════════

def get_conversation_messages(conv_id: str) -> list[dict]:
    with _db() as conn:
        rows = conn.execute(
            "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at",
            (conv_id,),
        ).fetchall()
    return [dict(r) for r in rows]

def get_conversation_summary(conv_id: str) -> str:
    with _db() as conn:
        row = conn.execute(
            "SELECT summary_text FROM conversation_memory WHERE conversation_id = ?",
            (conv_id,),
        ).fetchone()
    return row["summary_text"] if row else ""

def upsert_conversation_summary(conv_id: str, summary_text: str):
    now = _now_iso()
    with _db() as conn:
        conn.execute("""
            INSERT INTO conversation_memory (conversation_id, summary_text, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(conversation_id)
            DO UPDATE SET summary_text = excluded.summary_text,
                          updated_at = excluded.updated_at
        """, (conv_id, summary_text, now))

def format_messages_for_prompt(messages: list[dict]) -> str:
    out = []
    for m in messages:
        role = "Usuario" if m["role"] == "user" else "Asistente"
        out.append(f"{role}: {m['content']}")
    return "\n".join(out)

def summarize_old_messages(conv_id: str):
    messages = get_conversation_messages(conv_id)
    if len(messages) <= SUMMARY_KEEP_LAST_N:
        return

    old_msgs = messages[:-SUMMARY_KEEP_LAST_N]
    recent_msgs = messages[-SUMMARY_KEEP_LAST_N:]

    old_text = format_messages_for_prompt(old_msgs)
    if len(old_text) < SUMMARY_TRIGGER_CHARS:
        return

    prev_summary = get_conversation_summary(conv_id)

    prompt = f"""
Resume esta conversación previa de forma acumulativa.
Objetivo: conservar hechos, decisiones, definiciones, preferencias del usuario,
temas abiertos y contexto útil para responder después.

Resumen previo acumulado:
{prev_summary}

Mensajes antiguos nuevos:
{old_text}

Devuelve un resumen breve pero útil, en viñetas cortas o frases compactas.
No inventes.
"""

    response = llm.responses.create(
        model=MODEL_NAME,
        input=prompt
    )

    new_summary = response.output_text.strip()
    upsert_conversation_summary(conv_id, new_summary)

def build_chat_context(conv_id: str | None) -> str:
    if not conv_id:
        return ""

    summarize_old_messages(conv_id)

    summary_text = get_conversation_summary(conv_id)
    messages = get_conversation_messages(conv_id)
    recent_msgs = messages[-MAX_RECENT_MESSAGES:]

    recent_text = format_messages_for_prompt(recent_msgs)

    parts = []
    if summary_text:
        parts.append(f"RESUMEN_ACUMULADO_CONVERSACION:\n{summary_text}")

    if recent_text:
        parts.append(f"MENSAJES_RECIENTES:\n{recent_text}")

    return "\n\n".join(parts).strip()

# ═══════════════════════════════════════════════════════════════════════════════
# BGE RERANK (CROSS ENCODER)
# ═══════════════════════════════════════════════════════════════════════════════

def bge_rerank(query, items, top_k=5):
    if not items:
        return items

    pairs = []
    for it in items:
        text = str(it.get("document", "") or "")
        pairs.append((query, text))

    scores = bge_model.predict(pairs)

    rescored = []
    for i, it in enumerate(items):
        x = dict(it)
        x["bge_score"] = float(scores[i])
        x["final_score"] = float(scores[i])
        rescored.append(x)

    rescored.sort(key=lambda x: x["bge_score"], reverse=True)
    return rescored[:top_k]

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def lexical_score(query: str, text: str, metadata: Dict[str, Any]) -> float:
    qn = _normalize(query)
    qt = set(_tokenize(query))

    base_text = " ".join([
        str(text or ""),
        str(metadata.get("title_guess", "") or ""),
        str(metadata.get("source_file", "") or ""),
        str(metadata.get("topics", "") or ""),
        str(metadata.get("summary", "") or ""),
        str(metadata.get("summary_dense", "") or ""),
        str(metadata.get("key_entities", "") or ""),
        str(metadata.get("likely_queries", "") or ""),
        str(metadata.get("retrieval_text", "") or ""),
        str(metadata.get("section_title", "") or ""),
    ])

    tn = _normalize(base_text)
    tt = set(_tokenize(base_text))

    overlap = len(qt.intersection(tt)) / max(1, len(qt))

    phrase_bonus = 0.0
    if qn and qn in tn:
        phrase_bonus += 0.4

    for token in qt:
        if len(token) >= 4 and token in tn:
            phrase_bonus += 0.04

    return overlap + min(0.4, phrase_bonus)

def raw_query_chunks(pregunta: str):
    return chunks_collection.query(
        query_texts=[pregunta],
        n_results=N_RESULTS_CHUNKS_RAW,
        include=["documents", "metadatas", "distances"],
    )

def raw_query_docs(pregunta: str):
    return docs_collection.query(
        query_texts=[pregunta],
        n_results=N_RESULTS_DOCS_RAW,
        include=["documents", "metadatas", "distances"],
    )

def query_chunks(pregunta: str):
    raw = raw_query_chunks(pregunta)
    return rerank_results(pregunta, raw, TOP_CHUNKS_AFTER_RERANK)

def query_docs(pregunta: str):
    raw = raw_query_docs(pregunta)
    return rerank_results(pregunta, raw, TOP_DOCS_AFTER_RERANK)

def keyword_hits_from_raw(query: str, raw: Dict[str, Any], item_type: str, top_k: int):
    ids = (raw.get("ids") or [[]])[0]
    docs = (raw.get("documents") or [[]])[0]
    metas = (raw.get("metadatas") or [[]])[0]

    out = []
    for i in range(len(ids)):
        item_id = ids[i]
        doc = str(docs[i] if i < len(docs) else "")
        meta = metas[i] if i < len(metas) and isinstance(metas[i], dict) else {}
        score = lexical_score(query, doc, meta)

        out.append({
            "id": item_id,
            "document": doc,
            "metadata": meta,
            "distance": None,
            "semantic_score": 0.0,
            "lexical_score": round(score, 4),
            "phrase_bonus": 0.0,
            "metadata_bonus": 0.0,
            "final_score": round(score + 0.25, 4),
            "item_type": item_type,
            "retrieval_mode": "keyword",
        })

    out.sort(key=lambda x: x["final_score"], reverse=True)
    return out[:top_k]

def tag_items(items: List[Dict[str, Any]], item_type: str, retrieval_mode: str):
    out = []
    for it in items:
        x = dict(it)
        x["item_type"] = item_type
        x["retrieval_mode"] = retrieval_mode
        out.append(x)
    return out

def dedupe_and_merge(items: List[Dict[str, Any]], top_k: int):
    best = {}
    for it in items:
        item_id = it["id"]
        if item_id not in best or it["final_score"] > best[item_id]["final_score"]:
            best[item_id] = it

    merged = list(best.values())
    merged.sort(key=lambda x: x["final_score"], reverse=True)
    return merged[:top_k]

def load_cluster_map(path: str) -> Dict[str, Dict[str, Any]]:
    cluster_map = {}
    if not os.path.exists(path):
        print(f"[WARN] No existe archivo de clusters: {path}")
        return cluster_map

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue

            document_id = str(obj.get("document_id", "") or "").strip()
            if not document_id:
                continue

            cluster_map[document_id] = {
                "cluster_l1": obj.get("cluster_l1"),
                "cluster_l1_size": obj.get("cluster_l1_size"),
                "cluster_l1_label": obj.get("cluster_l1_label", ""),
                "cluster_l2": obj.get("cluster_l2"),
                "cluster_l2_size": obj.get("cluster_l2_size"),
                "cluster_l2_label": obj.get("cluster_l2_label", ""),
            }

    print(f"[INFO] Clusters cargados: {len(cluster_map)} documentos")
    return cluster_map


CLUSTER_MAP = load_cluster_map(CLUSTERS_PATH)


def enrich_item_with_clusters(it: Dict[str, Any]) -> Dict[str, Any]:
    x = dict(it)
    meta = dict(x.get("metadata", {}) or {})

    document_id = str(meta.get("document_id", "") or "").strip()
    if not document_id:
        x["metadata"] = meta
        return x

    cluster_info = CLUSTER_MAP.get(document_id)
    if cluster_info:
        meta.update(cluster_info)

    x["metadata"] = meta
    return x


def enrich_items_with_clusters(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [enrich_item_with_clusters(it) for it in items]


def cluster_match_bonus(query: str, metadata: Dict[str, Any]) -> float:
    qn = _normalize(query)

    cluster_text = " ".join([
        str(metadata.get("cluster_l1_label", "") or ""),
        str(metadata.get("cluster_l2_label", "") or ""),
    ])
    cn = _normalize(cluster_text)

    if not qn or not cn:
        return 0.0

    q_tokens = set(_tokenize(qn))
    c_tokens = set(_tokenize(cn))
    if not q_tokens or not c_tokens:
        return 0.0

    overlap = len(q_tokens.intersection(c_tokens)) / max(1, len(q_tokens))
    return min(CLUSTER_BOOST, overlap * CLUSTER_BOOST)


def apply_cluster_boost(query: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    boosted = []

    for it in items:
        x = dict(it)
        meta = x.get("metadata", {}) or {}
        bonus = cluster_match_bonus(query, meta)
        x["cluster_bonus"] = round(bonus, 4)
        x["final_score"] = float(x.get("final_score", 0.0)) + bonus
        boosted.append(x)

    boosted.sort(key=lambda x: x["final_score"], reverse=True)
    return boosted

def build_mixed_context(items):
    bloques = []

    for it in items:
        m = it["metadata"]
        item_type = it.get("item_type", "chunk")
        retrieval_mode = it.get("retrieval_mode", "vector")

        if item_type == "doc":
            document_id = str(m.get("document_id", ""))
            source_file = str(m.get("source_file", ""))
            doc_class = str(m.get("doc_class", ""))
            title_guess = str(m.get("title_guess", ""))
            summary = str(m.get("summary_dense", m.get("summary", "")))
            topics = str(m.get("topics", ""))
            page_count = str(m.get("page_count", ""))

            cluster_l1 = str(m.get("cluster_l1", ""))
            cluster_l1_label = str(m.get("cluster_l1_label", ""))
            cluster_l2 = str(m.get("cluster_l2", ""))
            cluster_l2_label = str(m.get("cluster_l2_label", ""))

            bloques.append(f"""[DOC {document_id}]
MODO: {retrieval_mode}
ARCHIVO: {source_file}
TIPO: {doc_class}
TITULO: {title_guess}
PAGINAS: {page_count}
TEMAS: {topics}
CLUSTER_L1: {cluster_l1} | {cluster_l1_label}
CLUSTER_L2: {cluster_l2} | {cluster_l2_label}
SCORE: {it["final_score"]}
RESUMEN: {summary}
TEXTO_EMBED:
{it["document"]}""")
        else:
            chunk_id = str(m.get("chunk_id", ""))
            source_file = str(m.get("source_file", ""))
            page_start = str(m.get("page_start", ""))
            page_end = str(m.get("page_end", page_start))
            doc_class = str(m.get("doc_class", ""))
            section_title = str(m.get("section_title", ""))

            cluster_l1 = str(m.get("cluster_l1", ""))
            cluster_l1_label = str(m.get("cluster_l1_label", ""))
            cluster_l2 = str(m.get("cluster_l2", ""))
            cluster_l2_label = str(m.get("cluster_l2_label", ""))

            header = f"[{chunk_id} | {source_file} | p.{page_start}-{page_end}"
            if section_title:
                header += f" | {section_title}"
            if doc_class:
                header += f" | tipo={doc_class}"
            header += "]"

            bloques.append(f"""{header}
MODO: {retrieval_mode}
CLUSTER_L1: {cluster_l1} | {cluster_l1_label}
CLUSTER_L2: {cluster_l2} | {cluster_l2_label}
SCORE: {it["final_score"]}
{it["document"]}""")

    return "\n\n".join(bloques)

def parse_citas(text: str) -> tuple[str, list[str]]:
    match = re.search(r"CITAS_USADAS:\s*(.*)", text, re.IGNORECASE)
    if not match:
        return text.strip(), []
    answer = text[: match.start()].strip()
    raw_citas = match.group(1).strip()
    if not raw_citas:
        return answer, []
    citas = [c.strip() for c in raw_citas.split("|") if c.strip()]
    return answer, citas

def items_to_sources(items, citas: list[str]):
    citas_set = set(citas)
    sources = []

    for it in items:
        m = it["metadata"]
        item_id = it["id"]

        if citas_set and item_id not in citas_set:
            continue

        item_type = it.get("item_type", "chunk")

        if item_type == "doc":
            sources.append({
                "document_name": str(m.get("source_file", m.get("document_id", ""))),
                "document_path": str(m.get("relative_path", m.get("source_path", ""))),
                "excerpt": str(m.get("summary_dense", m.get("summary", "")))[:300],
                "page": int(m.get("page_count", 0)),
                "score": round(float(it["final_score"]), 4),
            })
        else:
            sources.append({
                "document_name": str(m.get("source_file", "")),
                "document_path": str(m.get("relative_path", m.get("source_path", ""))),
                "excerpt": str(it["document"])[:300],
                "page": int(m.get("page_start", 0)),
                "score": round(float(it["final_score"]), 4),
            })

    if not sources:
        for it in items[:3]:
            m = it["metadata"]
            item_type = it.get("item_type", "chunk")

            if item_type == "doc":
                sources.append({
                    "document_name": str(m.get("source_file", m.get("document_id", ""))),
                    "document_path": str(m.get("relative_path", m.get("source_path", ""))),
                    "excerpt": str(m.get("summary_dense", m.get("summary", "")))[:300],
                    "page": int(m.get("page_count", 0)),
                    "score": round(float(it["final_score"]), 4),
                })
            else:
                sources.append({
                    "document_name": str(m.get("source_file", "")),
                    "document_path": str(m.get("relative_path", "")),
                    "excerpt": str(it["document"])[:300],
                    "page": int(m.get("page_start", 0)),
                    "score": round(float(it["final_score"]), 4),
                })

    return sources

def run_rag(pregunta: str, conversation_id: str | None = None) -> dict:
    t0 = time.time()

    query_type = detect_query_type(pregunta)
    docs_items = []
    docs_kw = []
    chunks_items = []
    chunks_kw = []
    merged_items = []

    if query_type == "doc":
        docs_raw = raw_query_docs(pregunta)
        docs_items = tag_items(
            rerank_results(pregunta, docs_raw, TOP_DOCS_AFTER_RERANK),
            "doc",
            "vector"
        )
        docs_kw = keyword_hits_from_raw(pregunta, docs_raw, "doc", KEYWORD_TOP_K)

        merged_items = dedupe_and_merge(
            docs_items + docs_kw,
            top_k=20
        )
        merged_items = enrich_items_with_clusters(merged_items)
        merged_items = apply_cluster_boost(pregunta, merged_items)

        if len(merged_items) < 2:
            query_type = "hybrid"

    if query_type == "chunk":
        chunks_raw = raw_query_chunks(pregunta)
        chunks_items = tag_items(
            rerank_results(pregunta, chunks_raw, TOP_CHUNKS_AFTER_RERANK),
            "chunk",
            "vector"
        )
        chunks_kw = keyword_hits_from_raw(pregunta, chunks_raw, "chunk", KEYWORD_TOP_K)

        merged_items = dedupe_and_merge(
            chunks_items + chunks_kw,
            top_k=20
        )
        merged_items = enrich_items_with_clusters(merged_items)
        merged_items = apply_cluster_boost(pregunta, merged_items)

        if len(merged_items) < 2:
            query_type = "hybrid"

    if query_type == "hybrid":
        docs_raw = raw_query_docs(pregunta)
        docs_items = tag_items(
            rerank_results(pregunta, docs_raw, TOP_DOCS_AFTER_RERANK),
            "doc",
            "vector"
        )
        docs_kw = keyword_hits_from_raw(pregunta, docs_raw, "doc", KEYWORD_TOP_K)

        chunks_raw = raw_query_chunks(pregunta)
        chunks_items = tag_items(
            rerank_results(pregunta, chunks_raw, TOP_CHUNKS_AFTER_RERANK),
            "chunk",
            "vector"
        )
        chunks_kw = keyword_hits_from_raw(pregunta, chunks_raw, "chunk", KEYWORD_TOP_K)

        merged_items = dedupe_and_merge(
            docs_items + docs_kw + chunks_items + chunks_kw,
            top_k=30
        )
        merged_items = enrich_items_with_clusters(merged_items)
        merged_items = apply_cluster_boost(pregunta, merged_items)

    merged_items = bge_rerank(pregunta, merged_items, top_k=8)

    contexto = build_mixed_context(merged_items)

    if query_type == "doc":
        instruction = (
            "Resume y conecta información entre documentos. "
            "Usa los clusters para identificar familias temáticas, agrupar ideas y evitar mezclar temas distintos."
        )
    elif query_type == "hybrid":
        instruction = (
            "Usa todas las fuentes relevantes. Combina contexto general y detalles. "
            "Considera los clusters como señal temática para unir documentos relacionados."
        )
    else:
        instruction = (
            "Responde con precisión usando los fragmentos más relevantes. "
            "Si varios fragmentos pertenecen al mismo cluster, prioriza su coherencia temática."
        )
    chat_context = build_chat_context(conversation_id)

    prompt = f"""
{instruction}

Responde SOLO con este contexto.
No inventes información.
Si no está en el contexto recuperado ni en la conversación, responde exactamente:
No encontrado en los documentos recuperados.

Cuando corresponda:
- usa primero chunks para detalles exactos
- usa docs para resumir o conectar contexto general
- usa la conversación previa solo como apoyo contextual, no como reemplazo del corpus
- si la conversación previa contradice a los documentos, prioriza los documentos

Sé claro, específico, corto y útil.

Pregunta:
{pregunta}

Contexto de conversación:
{chat_context}

Contexto documental:
{contexto}
"""

    response = llm.responses.create(
        model=MODEL_NAME,
        input=prompt
    )

    raw_text = response.output_text
    answer, citas = parse_citas(raw_text)
    sources = items_to_sources(merged_items, citas)

    elapsed_ms = int((time.time() - t0) * 1000)

    return {
        "answer": answer,
        "sources": sources,
        "metadata": {
            "model": MODEL_NAME,
            "embedding_model": EMBED_MODEL,
            "rerank_model": RERANK_MODEL,
            "query_type": query_type,
            "processing_time_ms": elapsed_ms,
            "debug": {
                "chunks_vector_count": len(chunks_items) if chunks_items else 0,
                "chunks_keyword_count": len(chunks_kw) if chunks_kw else 0,
                "docs_vector_count": len(docs_items) if docs_items else 0,
                "docs_keyword_count": len(docs_kw) if docs_kw else 0,
                "final_context_items": len(merged_items),
            }
        }
    }

# ═══════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class QueryRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None

class SourceOut(BaseModel):
    document_name: str
    document_path: Optional[str] = ""
    excerpt: str
    page: Optional[int] = 0
    score: Optional[float] = 0.0

class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceOut]
    metadata: Optional[dict] = None

class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[list[SourceOut]] = None
    created_at: str

class ConversationDetailOut(BaseModel):
    id: str
    title: str
    messages: list[MessageOut]
    created_at: str
    updated_at: str

class RenameRequest(BaseModel):
    title: str

# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(title="RACER API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    print("RACER API lista")
    print(f"Embedding model: {EMBED_MODEL}")
    print(f"Rerank model: {RERANK_MODEL}")

@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(400, "La pregunta está vacía")

    conv_id = req.conversation_id

    if conv_id:
        with _db() as conn:
            row = conn.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,)).fetchone()
            if not row:
                now = _now_iso()
                conn.execute(
                    "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (conv_id, question[:60], now, now),
                )

    if conv_id:
        user_msg_id = str(uuid.uuid4())
        with _db() as conn:
            conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)",
                (user_msg_id, conv_id, question, _now_iso()),
            )

    result = run_rag(question, conv_id)

    if conv_id:
        assistant_msg_id = str(uuid.uuid4())
        with _db() as conn:
            conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, sources_json, created_at) VALUES (?, ?, 'assistant', ?, ?, ?)",
                (assistant_msg_id, conv_id, result["answer"], json.dumps(result["sources"], ensure_ascii=False), _now_iso()),
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (_now_iso(), conv_id),
            )

    return result

@app.get("/conversations", response_model=list[ConversationOut])
def list_conversations():
    with _db() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/conversations/{conv_id}", response_model=ConversationDetailOut)
def get_conversation(conv_id: str):
    with _db() as conn:
        conv = conn.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?", (conv_id,)
        ).fetchone()
        if not conv:
            raise HTTPException(404, "Conversación no encontrada")

        msgs = conn.execute(
            "SELECT id, role, content, sources_json, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at",
            (conv_id,),
        ).fetchall()

    messages = []
    for m in msgs:
        sources = None
        if m["sources_json"]:
            try:
                sources = json.loads(m["sources_json"])
            except Exception:
                sources = None
        messages.append({
            "id": m["id"],
            "role": m["role"],
            "content": m["content"],
            "sources": sources,
            "created_at": m["created_at"],
        })

    return {
        "id": conv["id"],
        "title": conv["title"],
        "messages": messages,
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"],
    }

@app.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    with _db() as conn:
        conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    return {"ok": True}

@app.patch("/conversations/{conv_id}")
def rename_conversation(conv_id: str, req: RenameRequest):
    with _db() as conn:
        conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (req.title, _now_iso(), conv_id),
        )
    return {"ok": True}

@app.delete("/conversations")
def delete_all_conversations():
    with _db() as conn:
        conn.execute("DELETE FROM messages")
        conn.execute("DELETE FROM conversations")
    return {"ok": True}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "chunks_count": chunks_collection.count(),
        "docs_count": docs_collection.count(),
        "embedding_model": EMBED_MODEL,
        "rerank_model": RERANK_MODEL,
    }
