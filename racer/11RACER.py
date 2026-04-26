import os
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from openai import OpenAI
from dotenv import load_dotenv
from r09erank import rerank_results

# ========= CONFIG =========
CHROMA_PATH = "./08ChromaDB"
COLLECTION_CHUNKS = "documentos_rag"
COLLECTION_DOCS = "documentos_rag_docs"
MODEL_NAME = "gpt-5.4-mini"
CLASSIFIER_MODEL = "gpt-5.4-mini"

N_RESULTS_CHUNKS_RAW = 25
N_RESULTS_DOCS_RAW = 12
TOP_CHUNKS_AFTER_RERANK = 8
TOP_DOCS_AFTER_RERANK = 6
# ==========================

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("No se encontró OPENAI_API_KEY")

# ==========================
# CHROMA
# ==========================
client = chromadb.PersistentClient(path=CHROMA_PATH)

chunks_collection = client.get_collection(
    name=COLLECTION_CHUNKS,
    embedding_function=DefaultEmbeddingFunction()
)

docs_collection = client.get_collection(
    name=COLLECTION_DOCS,
    embedding_function=DefaultEmbeddingFunction()
)

# ==========================
# OPENAI
# ==========================
llm = OpenAI(api_key=api_key)

def clasificar_consulta_con_llm(pregunta: str) -> bool:
    prompt = f"""
Clasifica la siguiente consulta del usuario en UNA sola palabra:

- GLOBAL → si pide resumen, panorama, temas, tipos de documentos, visión general, o qué dicen varios documentos en conjunto.
- SPECIFIC → si pide un dato puntual, cláusula, frase, detalle exacto, página, sección o contenido concreto.

Responde SOLO una palabra:
GLOBAL
o
SPECIFIC

Consulta:
{pregunta}
"""

    response = llm.responses.create(
        model=CLASSIFIER_MODEL,
        input=prompt
    )

    salida = response.output_text.strip().upper()

    if salida == "GLOBAL":
        return True

    if salida == "SPECIFIC":
        return False

    if "GLOBAL" in salida:
        return True

    return False

def query_chunks(pregunta):
    raw = chunks_collection.query(
        query_texts=[pregunta],
        n_results=N_RESULTS_CHUNKS_RAW,
        include=["documents", "metadatas", "distances"]
    )
    return rerank_results(pregunta, raw, TOP_CHUNKS_AFTER_RERANK)

def query_docs(pregunta):
    raw = docs_collection.query(
        query_texts=[pregunta],
        n_results=N_RESULTS_DOCS_RAW,
        include=["documents", "metadatas", "distances"]
    )
    return rerank_results(pregunta, raw, TOP_DOCS_AFTER_RERANK)

def build_chunks_context(items):
    bloques = []

    for it in items:
        m = it["metadata"]

        chunk_id = str(m.get("chunk_id", ""))
        source_file = str(m.get("source_file", ""))
        page_start = str(m.get("page_start", ""))
        page_end = str(m.get("page_end", page_start))
        doc_class = str(m.get("doc_class", ""))
        section_title = str(m.get("section_title", ""))

        header = f"[{chunk_id} | {source_file} | p.{page_start}-{page_end}"
        if section_title:
            header += f" | {section_title}"
        if doc_class:
            header += f" | tipo={doc_class}"
        header += "]"

        bloques.append(
            f"""{header}
SCORE: {it["final_score"]}
{it["document"]}"""
        )

    return "\n\n".join(bloques)

def build_docs_context(items):
    bloques = []

    for it in items:
        m = it["metadata"]

        document_id = str(m.get("document_id", ""))
        source_file = str(m.get("source_file", ""))
        doc_class = str(m.get("doc_class", ""))
        title_guess = str(m.get("title_guess", ""))
        summary = str(m.get("summary", ""))
        topics = str(m.get("topics", ""))
        page_count = str(m.get("page_count", ""))

        bloques.append(
            f"""[DOC {document_id}]
ARCHIVO: {source_file}
TIPO: {doc_class}
TITULO: {title_guess}
PAGINAS: {page_count}
TEMAS: {topics}
SCORE: {it["final_score"]}
RESUMEN: {summary}
TEXTO_EMBED:
{it["document"]}"""
        )

    return "\n\n".join(bloques)

print("RACER listo\n")

while True:
    q = input("Pregunta: ").strip()

    if not q:
        continue

    if q.lower() in ["salir", "exit", "quit"]:
        break

    usar_docs = clasificar_consulta_con_llm(q)

    if usar_docs:
        items = query_docs(q)
        contexto = build_docs_context(items)

        prompt = f"""
Responde SOLO con este contexto.
No inventes información.
Si no está en el contexto, responde exactamente:
No encontrado en los documentos recuperados.

Entrega una respuesta clara y resumida.

Al final agrega una línea EXACTA:
CITAS_USADAS: document_id1 | document_id2 | document_id3

Usa SOLO document_id realmente utilizados del contexto.

Pregunta:
{q}

Contexto:
{contexto}
"""
    else:
        items = query_chunks(q)
        contexto = build_chunks_context(items)

        prompt = f"""
Responde SOLO con este contexto.
No inventes información.
Si no está en el contexto, responde exactamente:
No encontrado en los documentos recuperados.

Sé preciso y directo.

Al final agrega una línea EXACTA:
CITAS_USADAS: chunk_id1 | chunk_id2 | chunk_id3

Usa SOLO chunk_id realmente utilizados del contexto.

Pregunta:
{q}

Contexto:
{contexto}
"""

    response = llm.responses.create(
        model=MODEL_NAME,
        input=prompt
    )

    print("\n" + "=" * 100)
    print(response.output_text)
    print("=" * 100 + "\n")