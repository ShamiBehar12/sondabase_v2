import json
from pathlib import Path
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

# ============================================================
# CONFIGURACIÓN GENERAL
# ============================================================

# Opciones:
#   "chunks" -> usa 06Chunks/chunks.jsonl
#   "docs"   -> usa 06Documents/documents.jsonl
#   "both"   -> crea ambas colecciones
MODE = "both"

# Modelo de embeddings multilingüe recomendado para ES/PT
EMBED_MODEL = "BAAI/bge-m3"

# RUTAS ANTIGUAS QUE YA TE GUSTABAN
CHROMA_PATH = "./08ChromaDB"
COLLECTION_CHUNKS = "documentos_rag"
COLLECTION_DOCS = "documentos_rag_docs"

# Archivos de entrada
RUTA_CHUNKS = Path("06Chunks") / "chunks.jsonl"
RUTA_DOCS = Path("06Documents") / "documents.jsonl"

# Si True, borra y recrea la colección antes de cargar
# OJO: con las rutas antiguas, esto reemplaza lo que haya en esas colecciones
RECREAR_COLECCION = True

# Tamaño de lote para add()
BATCH_SIZE = 128


# ============================================================
# EMBEDDING FUNCTION
# ============================================================

embedding_fn = SentenceTransformerEmbeddingFunction(
    model_name=EMBED_MODEL
)


# ============================================================
# HELPERS
# ============================================================

def safe_str(x):
    if x is None:
        return ""
    return str(x)

def safe_int(x, default=0):
    try:
        if isinstance(x, bool):
            return int(x)
        return int(x)
    except Exception:
        return default

def recreate_collection_if_needed(client, collection_name):
    if not RECREAR_COLECCION:
        return
    existing = [c.name for c in client.list_collections()]
    if collection_name in existing:
        client.delete_collection(name=collection_name)
        print(f"[INFO] Colección borrada y recreada: {collection_name}")

def add_in_batches(collection, ids, documents, metadatas, batch_size=BATCH_SIZE):
    total = len(ids)
    if total == 0:
        return

    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        collection.add(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end]
        )
        print(f"Cargados {end}/{total} en colección {collection.name}")

def build_doc_embed_text(obj):
    document_id = safe_str(obj.get("document_id", ""))
    source_file = safe_str(obj.get("source_file", ""))
    relative_path = safe_str(obj.get("relative_path", ""))
    source_path = safe_str(obj.get("source_path", ""))
    doc_class = safe_str(obj.get("doc_class", ""))
    title_guess = safe_str(obj.get("title_guess", ""))
    summary = safe_str(obj.get("summary", ""))
    summary_dense = safe_str(obj.get("summary_dense", "") or summary)
    retrieval_text = safe_str(obj.get("retrieval_text", ""))
    ingested_at = safe_str(obj.get("ingested_at", ""))
    sample_text = safe_str(obj.get("sample_text", ""))

    page_count = safe_int(obj.get("page_count", 0), 0)
    char_count = safe_int(obj.get("char_count", 0), 0)

    topics = obj.get("topics", [])
    key_entities = obj.get("key_entities", [])
    likely_queries = obj.get("likely_queries", [])

    if not isinstance(topics, list):
        topics = []
    if not isinstance(key_entities, list):
        key_entities = []
    if not isinstance(likely_queries, list):
        likely_queries = []

    topics = [safe_str(x).strip() for x in topics if safe_str(x).strip()]
    key_entities = [safe_str(x).strip() for x in key_entities if safe_str(x).strip()]
    likely_queries = [safe_str(x).strip() for x in likely_queries if safe_str(x).strip()]

    topics_text = ", ".join(topics)
    entities_text = ", ".join(key_entities)
    queries_text = " | ".join(likely_queries)

    if not retrieval_text:
        retrieval_text = " | ".join([
            title_guess,
            doc_class,
            summary_dense,
            topics_text,
            entities_text,
            queries_text
        ])

    texto_embed = f"""
TITULO: {title_guess}
TIPO_DOCUMENTO: {doc_class}
RESUMEN_DENSO: {summary_dense}
TEMAS: {topics_text}
ENTIDADES_CLAVE: {entities_text}
CONSULTAS_PROBABLES: {queries_text}
ARCHIVO: {source_file}
RUTA_RELATIVA: {relative_path}
PAGINAS: {page_count}
TEXTO_RECUPERACION: {retrieval_text}
""".strip()

    metadata = {
        "document_id": document_id,
        "source_file": source_file,
        "relative_path": relative_path,
        "source_path": source_path,
        "doc_class": doc_class,
        "title_guess": title_guess,
        "summary": summary,
        "summary_dense": summary_dense,
        "topics": topics_text,
        "key_entities": entities_text,
        "likely_queries": queries_text,
        "retrieval_text": retrieval_text,
        "page_count": page_count,
        "char_count": char_count,
        "sample_text": sample_text,
        "ingested_at": ingested_at
    }

    return document_id, texto_embed, metadata

def build_chunk_embed_text(obj):
    chunk_id = safe_str(obj.get("chunk_id", ""))
    text = safe_str(obj.get("text", ""))

    document_id = safe_str(obj.get("document_id", ""))
    source_path = safe_str(obj.get("source_path", ""))
    source_file = safe_str(obj.get("source_file", ""))
    relative_path = safe_str(obj.get("relative_path", ""))
    doc_class = safe_str(obj.get("doc_class", ""))
    section_title = safe_str(obj.get("section_title", ""))
    ingested_at = safe_str(obj.get("ingested_at", ""))

    chunk_index = safe_int(obj.get("chunk_index", -1), -1)
    page_start = safe_int(obj.get("page_start", -1), -1)
    page_end = safe_int(obj.get("page_end", -1), -1)
    char_count = safe_int(obj.get("char_count", 0), 0)

    texto_embed = f"""
TITULO_SECCION: {section_title}
TIPO_DOCUMENTO: {doc_class}
ARCHIVO: {source_file}
RUTA_RELATIVA: {relative_path}
PAGINAS: {page_start}-{page_end}
TEXTO: {text}
""".strip()

    metadata = {
        "chunk_id": chunk_id,
        "document_id": document_id,
        "source_path": source_path,
        "source_file": source_file,
        "relative_path": relative_path,
        "chunk_index": chunk_index,
        "doc_class": doc_class,
        "page_start": page_start,
        "page_end": page_end,
        "section_title": section_title,
        "char_count": char_count,
        "ingested_at": ingested_at
    }

    return chunk_id, texto_embed, metadata

def load_docs_jsonl(client):
    if not RUTA_DOCS.exists():
        print(f"[WARN] No existe {RUTA_DOCS}")
        return

    recreate_collection_if_needed(client, COLLECTION_DOCS)

    collection = client.get_or_create_collection(
        name=COLLECTION_DOCS,
        embedding_function=embedding_fn
    )

    ids = []
    documents = []
    metadatas = []

    with open(RUTA_DOCS, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except Exception as e:
                print(f"[WARN] Línea inválida en docs: {e}")
                continue

            document_id, texto_embed, metadata = build_doc_embed_text(obj)

            if not document_id:
                continue

            ids.append(document_id)
            documents.append(texto_embed)
            metadatas.append(metadata)

    add_in_batches(collection, ids, documents, metadatas)

    print(f"\nColección docs: {COLLECTION_DOCS}")
    print("Documentos cargados:", collection.count())

def load_chunks_jsonl(client):
    if not RUTA_CHUNKS.exists():
        print(f"[WARN] No existe {RUTA_CHUNKS}")
        return

    recreate_collection_if_needed(client, COLLECTION_CHUNKS)

    collection = client.get_or_create_collection(
        name=COLLECTION_CHUNKS,
        embedding_function=embedding_fn
    )

    ids = []
    documents = []
    metadatas = []

    with open(RUTA_CHUNKS, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except Exception as e:
                print(f"[WARN] Línea inválida en chunks: {e}")
                continue

            chunk_id, texto_embed, metadata = build_chunk_embed_text(obj)

            if not chunk_id:
                continue

            ids.append(chunk_id)
            documents.append(texto_embed)
            metadatas.append(metadata)

    add_in_batches(collection, ids, documents, metadatas)

    print(f"\nColección chunks: {COLLECTION_CHUNKS}")
    print("Chunks cargados:", collection.count())


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    print(f"Modelo de embeddings: {EMBED_MODEL}")
    print(f"Chroma path: {CHROMA_PATH}")
    print(f"Modo: {MODE}")

    if MODE in ("docs", "both"):
        load_docs_jsonl(client)

    if MODE in ("chunks", "both"):
        load_chunks_jsonl(client)

    print("\nListo.")
