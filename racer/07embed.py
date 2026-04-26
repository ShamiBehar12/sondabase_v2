import json
from pathlib import Path
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

# 1) cliente persistente
client = chromadb.PersistentClient(path="./08ChromaDB")

# 2) colección
collection = client.get_or_create_collection(
    name="documentos_rag",
    embedding_function=DefaultEmbeddingFunction()
)

# 3) leer JSONL
ruta_jsonl = Path("06Chunks") / "chunks.jsonl"

ids = []
documents = []
metadatas = []

with open(ruta_jsonl, "r", encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)

        chunk_id = str(obj["chunk_id"])
        text = str(obj["text"])

        document_id = obj.get("document_id", "")
        source_path = obj.get("source_path", "")
        chunk_index = obj.get("chunk_index", -1)

        # convertir None a valores válidos
        if document_id is None:
            document_id = ""
        if source_path is None:
            source_path = ""
        if chunk_index is None:
            chunk_index = -1

        # asegurar tipos simples
        document_id = str(document_id)
        source_path = str(source_path)

        if isinstance(chunk_index, bool):
            chunk_index = int(chunk_index)
        elif isinstance(chunk_index, (int, float)):
            pass
        else:
            try:
                chunk_index = int(chunk_index)
            except:
                chunk_index = -1

        ids.append(chunk_id)
        documents.append(text)
        #print(type(document_id), document_id)
        #print(type(source_path), source_path)
        #print(type(chunk_index), chunk_index)
        

#############
#############

        source_file = obj.get("source_file", "")
        relative_path = obj.get("relative_path", "")
        doc_class = obj.get("doc_class", "")
        page_start = obj.get("page_start", -1)
        page_end = obj.get("page_end", -1)
        section_title = obj.get("section_title", "")
        char_count = obj.get("char_count", 0)
        ingested_at = obj.get("ingested_at", "")
        
        if source_file is None:
            source_file = ""
        if relative_path is None:
            relative_path = ""
        if doc_class is None:
            doc_class = ""
        if section_title is None:
            section_title = ""
        if ingested_at is None:
            ingested_at = ""
        
        try:
            page_start = int(page_start)
        except:
            page_start = -1
        
        try:
            page_end = int(page_end)
        except:
            page_end = -1
        
        try:
            char_count = int(char_count)
        except:
            char_count = 0
        
        metadatas.append({
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
        })

#############
#############

# 4) cargar a Chroma
collection.add(
    ids=ids,
    documents=documents,
    metadatas=metadatas
)

print("Listo. Chunks cargados:", collection.count())

# 5) prueba
results = collection.query(
    query_texts=["¿Qué dice el documento sobre mantenimiento preventivo?"],
    n_results=5,
    include=["documents", "metadatas", "distances"]
)

for i in range(len(results["ids"][0])):
    print("ID:", results["ids"][0][i])
    print("Metadata:", results["metadatas"][0][i])
    print("Distancia:", results["distances"][0][i])
    print("Texto:", results["documents"][0][i][:500])
    print("-" * 80)