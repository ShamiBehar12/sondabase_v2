import os
import re
import json
import csv
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

# =========================
# CONFIGURACIÓN
# =========================

base_dir = os.getcwd()

ruta_txt_in = os.path.join(base_dir, "04TXTout")
ruta_documents_out_dir = os.path.join(base_dir, "06Documents")
ruta_documents_out = os.path.join(ruta_documents_out_dir, "documents.jsonl")
ruta_log = os.path.join(ruta_documents_out_dir, "log_documents.csv")

reescribir_salida = True

modelo_resumen = "gpt-5.4-mini"
max_chars_para_resumen = 16000

# =========================
# OPENAI
# =========================

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("No se encontró OPENAI_API_KEY en el archivo .env")

client = OpenAI(api_key=api_key)

# =========================
# PREPARACIÓN
# =========================

os.makedirs(ruta_documents_out_dir, exist_ok=True)

if reescribir_salida and os.path.exists(ruta_documents_out):
    os.remove(ruta_documents_out)

if reescribir_salida and os.path.exists(ruta_log):
    os.remove(ruta_log)

with open(ruta_log, "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f, delimiter=";")
    writer.writerow([
        "fecha_hora",
        "archivo_txt",
        "document_id",
        "doc_class",
        "page_count",
        "estado",
        "detalle"
    ])

# =========================
# FUNCIONES AUXILIARES
# =========================

def clasificar_doc(texto: str) -> str:
    texto_lower = texto.lower()

    if (
        "cláusula" in texto_lower
        or "clausula" in texto_lower
        or "parágrafo" in texto_lower
        or "paragrafo" in texto_lower
    ):
        return "contrato"
    elif (
        "aclaración" in texto_lower
        or "aclaracion" in texto_lower
        or "ampliación" in texto_lower
        or "ampliacion" in texto_lower
    ):
        return "aclaracion"
    elif "certifica" in texto_lower or "certificado" in texto_lower:
        return "certificado"

    return "otro"

def contar_paginas(texto: str) -> int:
    matches = re.findall(r"===== PAGINA (\d+) =====", texto)
    if not matches:
        return 1

    try:
        return max(int(x) for x in matches)
    except Exception:
        return len(matches)

def limpiar_texto_base(texto: str) -> str:
    texto = texto.replace("\r\n", "\n").replace("\r", "\n")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()

def estimar_titulo_simple(texto: str, nombre_archivo: str) -> str:
    lineas = [x.strip() for x in texto.splitlines() if x.strip()]

    for linea in lineas[:20]:
        if "===== PAGINA" in linea:
            continue
        if 8 <= len(linea) <= 140:
            return linea

    return os.path.splitext(nombre_archivo)[0]

def resumen_fallback(texto: str, nombre_archivo: str):
    titulo = estimar_titulo_simple(texto, nombre_archivo)
    doc_class = clasificar_doc(texto)

    texto_plano = re.sub(r"\s+", " ", texto).strip()
    muestra = texto_plano[:500]

    summary = f"Documento tipo {doc_class}. Contenido inicial: {muestra}"
    topics = [doc_class]

    return titulo, summary, topics

def resumir_con_llm(texto: str, nombre_archivo: str):
    texto_plano = re.sub(r"\s+", " ", texto).strip()
    texto_recortado = texto_plano[:max_chars_para_resumen]

    prompt = f"""
Analiza este documento y devuelve SOLO JSON válido con esta estructura exacta:

{{
  "title_guess": "string",
  "summary": "string",
  "topics": ["tema1", "tema2", "tema3"]
}}

Reglas:
- El summary debe resumir de qué trata el documento en máximo 90 palabras.
- topics debe tener entre 3 y 8 temas cortos.
- No inventes información.
- Si el título real no es claro, crea un título descriptivo breve.
- Responde SOLO con JSON válido, sin markdown ni texto extra.

Nombre de archivo:
{nombre_archivo}

Contenido del documento:
{texto_recortado}
"""

    response = client.responses.create(
        model=modelo_resumen,
        input=prompt
    )

    out = response.output_text.strip()

    try:
        obj = json.loads(out)

        title_guess = str(obj.get("title_guess", "")).strip()
        summary = str(obj.get("summary", "")).strip()
        topics = obj.get("topics", [])

        if not title_guess:
            title_guess = os.path.splitext(nombre_archivo)[0]

        if not isinstance(topics, list):
            topics = []

        topics = [str(x).strip() for x in topics if str(x).strip()]

        if not summary:
            raise ValueError("summary vacío")

        if len(topics) == 0:
            topics = [clasificar_doc(texto)]

        return title_guess, summary, topics

    except Exception:
        return resumen_fallback(texto, nombre_archivo)

# =========================
# CONTADORES
# =========================

total_txt = 0
total_docs = 0
total_error = 0

# =========================
# RECORRER TXTs
# =========================

for raiz, carpetas, archivos in os.walk(ruta_txt_in):
    for nombre_archivo in archivos:
        if not nombre_archivo.lower().endswith(".txt"):
            continue

        total_txt += 1

        ruta_txt = os.path.join(raiz, nombre_archivo)
        ruta_relativa = os.path.relpath(ruta_txt, ruta_txt_in)

        try:
            with open(ruta_txt, "r", encoding="utf-8") as f:
                texto = f.read()

            texto = limpiar_texto_base(texto)

            if not texto:
                with open(ruta_log, "a", encoding="utf-8-sig", newline="") as f:
                    writer = csv.writer(f, delimiter=";")
                    writer.writerow([
                        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        ruta_txt,
                        "",
                        "",
                        0,
                        "omitido",
                        "texto vacío"
                    ])
                continue

            document_id = os.path.splitext(
                ruta_relativa.replace("\\", "__").replace("/", "__")
            )[0]

            doc_class = clasificar_doc(texto)
            page_count = contar_paginas(texto)
            char_count = len(texto)

            title_guess, summary, topics = resumir_con_llm(texto, nombre_archivo)

            registro = {
                "document_id": document_id,
                "source_file": nombre_archivo,
                "relative_path": ruta_relativa,
                "source_path": ruta_txt,
                "doc_class": doc_class,
                "page_count": page_count,
                "char_count": char_count,
                "title_guess": title_guess,
                "summary": summary,
                "topics": topics,
                "sample_text": re.sub(r"\s+", " ", texto)[:1200],
                "ingested_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

            with open(ruta_documents_out, "a", encoding="utf-8") as f:
                f.write(json.dumps(registro, ensure_ascii=False) + "\n")

            with open(ruta_log, "a", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_txt,
                    document_id,
                    doc_class,
                    page_count,
                    "ok",
                    "resumido"
                ])

            total_docs += 1
            print(f"[DOC OK] {ruta_txt}")

        except Exception as e:
            total_error += 1

            with open(ruta_log, "a", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_txt,
                    "",
                    "",
                    0,
                    "error",
                    str(e).replace(";", ",")
                ])

            print(f"[ERROR] {ruta_txt} -> {e}")

# =========================
# RESUMEN
# =========================

print("\n=========================")
print("RESUMEN DOCUMENTS")
print("=========================")
print("TXT procesados:", total_txt)
print("Documents generados:", total_docs)
print("Errores:", total_error)
print("Salida JSONL:", ruta_documents_out)
print("Log:", ruta_log)