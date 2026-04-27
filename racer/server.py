"""
RACER Smart Cities API
Ejecutar desde la carpeta racer/:
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""
import json, re, sqlite3, time
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import chromadb
from chromadb import EmbeddingFunction, Embeddings
import os
from ingest import ingest_document

class OpenAIEmbeddingFunction(EmbeddingFunction):
    def __init__(self, api_key: str, model_name: str):
        self._openai = OpenAI(api_key=api_key)
        self._model  = model_name

    def __call__(self, input: list[str]) -> Embeddings:
        resp = self._openai.embeddings.create(input=input, model=self._model)
        return [item.embedding for item in resp.data]

load_dotenv()

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
col_chunks = chroma.get_collection("chunks", embedding_function=ef)
col_docs   = chroma.get_collection("docs",   embedding_function=ef)

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
- Siempre cita la fuente. Ejemplo: "Según el Certificado Metro Panamá (apostillado), SONDA implementó el sistema de recaudo desde 2011."
- Si no tienes la información, responde: "No encontré esa información en los documentos disponibles."
- Cuando haya múltiples resultados, usa tabla Markdown con columnas: Cliente | País | Documento | Apostillado | Año
- Distingue apostillados de no apostillados. Para licitaciones internacionales, prioriza los apostillados.
- Si un documento tiene más de 3 años, indica "(revisar vigencia)".
- Si existen múltiples versiones de un documento (v1, v2), menciona ambas y sugiere la más reciente.
- Sé proactivo: si detectas información relacionada útil, ofrécela.

REGLAS CRÍTICAS
- NUNCA inventes experiencias, montos, fechas o clientes. Información falsa puede descalificar a SONDA en licitaciones.
- Responde SOLO con información del contexto proporcionado.
- Prioriza documentos apostillados para licitaciones internacionales.
- Ante preguntas ambiguas, clarifica antes de responder.
- Los datos son de uso interno de SONDA exclusivamente."""

class QueryRequest(BaseModel):
    question:          str
    pais:              Optional[str] = None
    solo_apostillados: bool          = False
    ano_desde:         Optional[int] = None
    conversation_id:   Optional[str] = None

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
    tipo    = detectar_tipo(req.question)
    filtros = extraer_filtros(req.question, req.pais, req.solo_apostillados)
    items   = buscar(req.question, tipo, filtros, n=8)
    if req.ano_desde:
        items = [x for x in items if (x["meta"].get("year") or 0) >= req.ano_desde]
    if not items:
        return QueryResponse(answer="No encontré documentos que coincidan.",
                             sources=[], tipo=tipo, filtros=filtros)
    contexto = construir_contexto(items)
    r = llm.chat.completions.create(
        model=MODELO, temperature=0,
        messages=[{"role":"system","content":SYSTEM_PROMPT},
                  {"role":"user","content":f"Pregunta: {req.question}\n\nContexto:\n{contexto}"}]
    )
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

@app.get("/ingest/stats")
def ingest_stats():
    return {
        "chunks": col_chunks.count(),
        "docs":   col_docs.count(),
    }