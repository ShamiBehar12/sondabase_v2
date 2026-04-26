import re
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

UPPER_TOKEN_RE = re.compile(r"\b[A-ZÁÉÍÓÚÑÇ0-9][A-ZÁÉÍÓÚÑÇ0-9\.\-]{2,}\b")
CODE_RE = re.compile(r"\b\d+(?:[\.\-\/]\d+){1,}\b")


def looks_like_acronym_or_code(q: str) -> bool:
    if UPPER_TOKEN_RE.search(q):
        return True
    if CODE_RE.search(q):
        return True

    for t in q.split():
        if len(t) >= 3 and t.isupper():
            return True

    return False


def is_definition_query(q: str) -> bool:
    ql = q.lower().strip()
    patterns = [
        "qué es ",
        "que es ",
        "qué significa ",
        "que significa ",
        "definición de ",
        "definicion de ",
        "significado de ",
    ]
    return any(ql.startswith(p) for p in patterns)


def is_document_listing_query(q: str) -> bool:
    ql = q.lower().strip()

    patterns = [
        "qué documentos",
        "que documentos",
        "cuáles documentos",
        "cuales documentos",
        "qué archivos",
        "que archivos",
        "cuáles archivos",
        "cuales archivos",
        "qué contratos",
        "que contratos",
        "cuáles contratos",
        "cuales contratos",
        "qué textos",
        "que textos",
        "qué papers",
        "que papers",
        "qué fuentes",
        "que fuentes",
    ]

    return any(ql.startswith(p) for p in patterns)


def has_global_doc_signal(q: str) -> bool:
    ql = q.lower().strip()

    doc_signals = [
        "resumen",
        "general",
        "overview",
        "panorama",
        "de qué habla",
        "de que habla",
        "en general",
        "tema general",
        "contexto general",
        "conjunto de documentos",
        "todos los documentos",
        "documentos sobre",
        "documentos acerca de",
        "documentos que hablan de",
        "documentos que mencionan",
    ]

    return any(x in ql for x in doc_signals)


def has_precise_chunk_signal(q: str) -> bool:
    ql = q.lower().strip()

    chunk_signals = [
        "clausula",
        "cláusula",
        "detalle",
        "exacto",
        "que dice",
        "qué dice",
        "valor exacto",
        "articulo",
        "artículo",
        "número",
        "numero",
        "partida",
        "código",
        "codigo",
        "folio",
        "itbms",
        "iva",
        "rut",
        "monto exacto",
        "fecha exacta",
    ]

    return any(x in ql for x in chunk_signals)


def heuristic_router(q: str):
    # 1) Señales fuertes de chunk
    if looks_like_acronym_or_code(q):
        return "chunk"

    if is_definition_query(q):
        return "chunk"

    if has_precise_chunk_signal(q):
        return "chunk"

    # 2) Señales fuertes de doc
    if is_document_listing_query(q):
        return "doc"

    if has_global_doc_signal(q):
        return "doc"

    # 3) Si no es claro, que decida el LLM
    return None


def llm_router(q: str):
    prompt = f"""
Clasifica esta query en una sola categoría:

- doc = visión general, resumen, panorama, listado de documentos, comparación amplia, contexto temático global.
- chunk = búsqueda precisa de un dato, definición puntual, cláusula, artículo, valor exacto, código, fecha, número o fragmento específico.
- hybrid = mezcla de ambas; necesita contexto general y también detalles concretos.

Responde SOLO con una palabra:
doc
chunk
hybrid

Query:
{q}
"""

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input=prompt
        )
        text = response.output_text.strip().lower()

        if "doc" == text:
            return "doc"
        if "chunk" == text:
            return "chunk"
        if "hybrid" == text:
            return "hybrid"

        # fallback por si responde con algo más largo
        if "hybrid" in text:
            return "hybrid"
        if "chunk" in text:
            return "chunk"
        if "doc" in text:
            return "doc"

        return "hybrid"

    except Exception:
        return "hybrid"


def detect_query_type(q: str) -> str:
    h = heuristic_router(q)
    if h is not None:
        return h
    return llm_router(q)