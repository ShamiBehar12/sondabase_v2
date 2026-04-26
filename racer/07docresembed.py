import json
from pathlib import Path
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

# =========================
# CONFIGURACIÓN
# =========================

CHROMA_PATH = "./08ChromaDB"
COLLECTION_NAME = "documentos_rag_docs"
RUTA_JSONL = Path("06Documents") / "documents.jsonl"
RECREAR_COLECCION = True

# =========================
# CHROMA
# =========================

client = chromadb.PersistentClient(path=CHROMA_PATH)

if RECREAR_COLECCION:
    existing = [c.name for c in client.list_collections()]
    if COLLECTION_NAME in existing:
        client.delete_collection(name=COLLECTION_NAME)

collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=DefaultEmbeddingFunction()
)

# =========================
# LEER JSONL
# =========================

ids = []
documents = []
metadatas = []

with open(RUTA_JSONL, "r", encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)

        document_id = str(obj.get("document_id", "") or "")
        source_file = str(obj.get("source_file", "") or "")
        relative_path = str(obj.get("relative_path", "") or "")
        source_path = str(obj.get("source_path", "") or "")
        doc_class = str(obj.get("doc_class", "") or "")
        title_guess = str(obj.get("title_guess", "") or "")
        summary = str(obj.get("summary", "") or "")
        ingested_at = str(obj.get("ingested_at", "") or "")

        page_count = obj.get("page_count", 0)
        char_count = obj.get("char_count", 0)
        topics = obj.get("topics", [])
        sample_text = str(obj.get("sample_text", "") or "")

        if not document_id:
            continue

        try:
            page_count = int(page_count)
        except Exception:
            page_count = 0

        try:
            char_count = int(char_count)
        except Exception:
            char_count = 0

        if not isinstance(topics, list):
            topics = []

        topics = [str(x).strip() for x in topics if str(x).strip()]
        topics_text = ", ".join(topics)

        # Este es el texto que realmente se embebe
        texto_embed = f"""
TITULO: {title_guess}
TIPO_DOCUMENTO: {doc_class}
RESUMEN: {summary}
TEMAS: {topics_text}
ARCHIVO: {source_file}
RUTA_RELATIVA: {relative_path}
PAGINAS: {page_count}
""".strip()

        ids.append(document_id)
        documents.append(texto_embed)
        metadatas.append({
            "document_id": document_id,
            "source_file": source_file,
            "relative_path": relative_path,
            "source_path": source_path,
            "doc_class": doc_class,
            "title_guess": title_guess,
            "summary": summary,
            "topics": topics_text,
            "page_count": page_count,
            "char_count": char_count,
            "sample_text": sample_text,
            "ingested_at": ingested_at
        })

# =========================
# CARGAR A CHROMA
# =========================

if ids:
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )

print("Colección:", COLLECTION_NAME)
print("Documentos cargados:", collection.count())

# =========================
# PRUEBA RÁPIDA
# =========================

results = collection.query(
    query_texts=["¿De qué tratan los documentos de certificados de Brasil?"],
    n_results=5,
    include=["documents", "metadatas", "distances"]
)

print("\n=== PRUEBA ===")
for i in range(len(results["ids"][0])):
    print("ID:", results["ids"][0][i])
    print("Metadata:", results["metadatas"][0][i])
    print("Distancia:", results["distances"][0][i])
    print("Texto embebido:", results["documents"][0][i][:500])
    print("-" * 80)