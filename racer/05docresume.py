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

reescribir_salida = False  # 🔥 IMPORTANTE: ahora NO queremos borrar

modelo_resumen = "gpt-4o-mini"
max_chars_para_resumen = 22000

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

if not os.path.exists(ruta_log):
    with open(ruta_log, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow([
            "fecha_hora","archivo_txt","document_id","doc_class","page_count","estado","detalle"
        ])

# =========================
# CACHE
# =========================

def ya_existe_documento(document_id):
    if not os.path.exists(ruta_documents_out):
        return False

    with open(ruta_documents_out, "r", encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
                if obj.get("document_id") == document_id:
                    return True
            except:
                continue
    return False

# =========================
# HELPERS
# =========================

def limpiar_texto(texto):
    texto = texto.replace("\r\n","\n").replace("\r","\n")
    texto = re.sub(r"[ \t]+"," ",texto)
    texto = re.sub(r"\n{3,}","\n\n",texto)
    return texto.strip()

def contar_paginas(texto):
    matches = re.findall(r"===== PAGINA (\d+) =====", texto)
    return max(map(int,matches)) if matches else 1

def clasificar_doc(texto):
    t = texto.lower()
    if "clausula" in t: return "contrato"
    if "aclaracion" in t: return "aclaracion"
    if "certificado" in t: return "certificado"
    return "otro"

def resumen_fallback(texto, nombre):
    return (
        nombre,
        texto[:500],
        ["otro"],
        [],
        []
    )

# =========================
# RESUMEN LLM
# =========================

def resumir_con_llm(texto, nombre_archivo):

    texto_plano = re.sub(r"\s+"," ",texto).strip()
    largo_original = len(texto_plano)

    max_output_chars = int(largo_original / 3)
    texto_recortado = texto_plano[:max_chars_para_resumen]

    prompt = f"""
Devuelve SOLO JSON:

{{
"title_guess": "",
"summary_dense": "",
"topics": [],
"key_entities": [],
"likely_queries": []
}}

REGLAS:
- summary_dense ULTRA DENSO
- estilo: frases cortas separadas por ";"
- NO narrativa
- incluir:
  - equipos
  - normas
  - variables
  - números
- MAX {max_output_chars} caracteres

Contenido:
{texto_recortado}
"""

    try:
        response = client.responses.create(
            model=modelo_resumen,
            input=prompt
        )

        obj = json.loads(response.output_text)

        return (
            obj.get("title_guess",""),
            obj.get("summary_dense","")[:max_output_chars],
            obj.get("topics",[]),
            obj.get("key_entities",[]),
            obj.get("likely_queries",[])
        )

    except:
        return resumen_fallback(texto, nombre_archivo)

# =========================
# MAIN
# =========================

for raiz, _, archivos in os.walk(ruta_txt_in):

    for nombre_archivo in archivos:

        if not nombre_archivo.endswith(".txt"):
            continue

        ruta_txt = os.path.join(raiz, nombre_archivo)

        with open(ruta_txt, "r", encoding="utf-8") as f:
            texto = limpiar_texto(f.read())

        if not texto:
            continue

        ruta_relativa = os.path.relpath(ruta_txt, ruta_txt_in)

        document_id = os.path.splitext(
            ruta_relativa.replace("\\","__").replace("/","__")
        )[0]

        # 🔥 CACHE
        if ya_existe_documento(document_id):
            print("[SKIP CACHE]", nombre_archivo)
            continue

        doc_class = clasificar_doc(texto)
        page_count = contar_paginas(texto)

        title, summary, topics, entities, queries = resumir_con_llm(
            texto, nombre_archivo
        )

        registro = {
            "document_id": document_id,
            "source_file": nombre_archivo,
            "relative_path": ruta_relativa,
            "source_path": ruta_txt,
            "doc_class": doc_class,
            "page_count": page_count,
            "title_guess": title,
            "summary_dense": summary,
            "topics": topics,
            "key_entities": entities,
            "likely_queries": queries,
            "ingested_at": datetime.now().isoformat()
        }

        with open(ruta_documents_out, "a", encoding="utf-8") as f:
            f.write(json.dumps(registro, ensure_ascii=False)+"\n")

        print("[OK]", nombre_archivo)