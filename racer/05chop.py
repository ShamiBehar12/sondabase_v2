import os
import re
import json
from datetime import datetime

# =========================
# CONFIGURACIÓN
# =========================

ruta_txt_in = os.path.join(os.getcwd(), "04TXTout")
ruta_chunks_out_dir = os.path.join(os.getcwd(), "06Chunks")
os.makedirs(ruta_chunks_out_dir, exist_ok=True)

ruta_chunks_out = os.path.join(ruta_chunks_out_dir, "chunks.jsonl")
ruta_log = os.path.join(ruta_chunks_out_dir, "log_chunks.csv")

# Si True, borra el chunks.jsonl anterior y lo reconstruye completo
reescribir_salida = True

# Umbrales
max_chars_por_chunk = 2200
min_chars_para_rechunk = 2500
min_chars_chunk_util = 250
overlap_chars = 180

# =========================
# PREPARACIÓN
# =========================

os.makedirs(ruta_chunks_out_dir, exist_ok=True)

if reescribir_salida and os.path.exists(ruta_chunks_out):
    os.remove(ruta_chunks_out)

if reescribir_salida and os.path.exists(ruta_log):
    os.remove(ruta_log)

with open(ruta_log, "w", encoding="utf-8-sig") as f:
    f.write("fecha_hora;archivo_txt;document_id;doc_class;chunks_generados;estado;detalle\n")

# =========================
# CONTADORES
# =========================

total_txt = 0
total_chunks = 0
total_error = 0

# =========================
# RECORRER TXT
# =========================

for raiz, carpetas, archivos in os.walk(ruta_txt_in):
    for nombre_archivo in archivos:
        if not nombre_archivo.lower().endswith(".txt"):
            continue

        total_txt += 1

        ruta_txt = os.path.join(raiz, nombre_archivo)
        ruta_relativa = os.path.relpath(ruta_txt, ruta_txt_in)

        document_id = os.path.splitext(
            ruta_relativa.replace("\\", "__").replace("/", "__")
        )[0]

        try:
            with open(ruta_txt, "r", encoding="utf-8") as f:
                texto_completo = f.read()

            # =========================
            # LIMPIEZA INICIAL
            # =========================

            texto_normalizado = texto_completo.replace("\r\n", "\n").replace("\r", "\n")
            texto_normalizado = re.sub(r"[ \t]+", " ", texto_normalizado)

            # Preservar marcadores de página antes de limpiar saltos
            texto_normalizado = re.sub(
                r"^[ ]*===== PAGINA[ ]+(\d+)[ ]*=====[ ]*$",
                r"@@@PAGE_\1@@@",
                texto_normalizado,
                flags=re.MULTILINE
            )

            # Quitar espacios alrededor de saltos
            texto_normalizado = re.sub(r" *\n *", "\n", texto_normalizado)

            # Unir líneas partidas dentro de un mismo párrafo
            texto_normalizado = re.sub(r"(?<!\n)\n(?!\n)", " ", texto_normalizado)

            # Reducir saltos excesivos a párrafos
            texto_normalizado = re.sub(r"\n{3,}", "\n\n", texto_normalizado)

            # Restaurar marcadores de página como bloque separado
            texto_normalizado = re.sub(
                r"@@@PAGE_(\d+)@@@",
                r"\n\n===== PAGINA \1 =====\n\n",
                texto_normalizado
            )

            # Limpiar saltos repetidos otra vez después de restaurar páginas
            texto_normalizado = re.sub(r"\n{3,}", "\n\n", texto_normalizado).strip()

            texto_lower = texto_normalizado.lower()

            # =========================
            # CLASIFICACIÓN SIMPLE
            # =========================

            doc_class = "otro"

            if (
                "cláusula" in texto_lower
                or "clausula" in texto_lower
                or "parágrafo" in texto_lower
                or "paragrafo" in texto_lower
            ):
                doc_class = "contrato"
            elif (
                "aclaración" in texto_lower
                or "aclaracion" in texto_lower
                or "ampliación" in texto_lower
                or "ampliacion" in texto_lower
            ):
                doc_class = "aclaracion"
            elif "certifica" in texto_lower or "certificado" in texto_lower:
                doc_class = "certificado"

            # =========================
            # PARTIR POR PÁGINAS
            # =========================

            partes = re.split(r"(?=^===== PAGINA \d+ =====$)", texto_normalizado, flags=re.MULTILINE)

            paginas = []
            pagina_actual_num = 1

            for parte in partes:
                parte = parte.strip()
                if not parte:
                    continue

                match_pagina = re.match(r"^===== PAGINA (\d+) =====\n?", parte)
                if match_pagina:
                    pagina_actual_num = int(match_pagina.group(1))
                    contenido_pagina = re.sub(r"^===== PAGINA \d+ =====\n?", "", parte, count=1).strip()
                else:
                    contenido_pagina = parte.strip()

                if contenido_pagina:
                    paginas.append({
                        "page_num": pagina_actual_num,
                        "text": contenido_pagina
                    })

            if len(paginas) == 0 and texto_normalizado:
                paginas = [{
                    "page_num": 1,
                    "text": texto_normalizado
                }]

            # =========================
            # METADATOS BASE
            # =========================

            source_file = nombre_archivo
            source_path = ruta_txt
            fecha_ingesta = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            chunk_index_global = 0
            chunks_generados_este_doc = 0

            # =========================
            # RECORRER PÁGINAS
            # =========================

            for pagina in paginas:
                page_num = pagina["page_num"]
                page_text = pagina["text"].strip()

                if not page_text:
                    continue

                # =========================
                # DETECCIÓN SIMPLE DE TÍTULO/SECCIÓN
                # =========================

                section_title = "pagina"

                primeras_lineas = page_text.split("\n")[:12]
                primeras_lineas_limpias = [x.strip() for x in primeras_lineas if x.strip()]

                if len(primeras_lineas_limpias) <= 2:
                    primeras_lineas_limpias = re.split(r"(?<=[\.:])\s+", page_text[:500])

                for linea in primeras_lineas_limpias:
                    linea = linea.strip()
                    if not linea:
                        continue

                    linea_lower = linea.lower()

                    if "objeto y/o alcance" in linea_lower:
                        section_title = "objeto_alcance"
                        break
                    elif "servicios prestados" in linea_lower:
                        section_title = "servicios_prestados"
                        break
                    elif "provisión de equipamiento" in linea_lower or "provision de equipamiento" in linea_lower:
                        section_title = "equipamiento"
                        break
                    elif "calificación de calidad" in linea_lower or "calificacion de calidad" in linea_lower:
                        section_title = "calidad"
                        break
                    elif "tecnologías y metodologías empleadas" in linea_lower or "tecnologias y metodologias empleadas" in linea_lower:
                        section_title = "tecnologias_metodologias"
                        break
                    elif "aclaración" in linea_lower or "aclaracion" in linea_lower:
                        section_title = "aclaracion"
                        break
                    elif "cláusula" in linea_lower or "clausula" in linea_lower:
                        section_title = linea[:120]
                        break
                    elif "consideraciones" in linea_lower:
                        section_title = "consideraciones"
                        break
                    elif "obligaciones" in linea_lower:
                        section_title = "obligaciones"
                        break
                    elif "valor del contrato" in linea_lower:
                        section_title = "valor_contrato"
                        break
                    elif "forma de pago" in linea_lower:
                        section_title = "forma_pago"
                        break
                    elif "garant" in linea_lower:
                        section_title = "garantias"
                        break
                    elif "confidencialidad" in linea_lower:
                        section_title = "confidencialidad"
                        break
                    elif "solución de controversias" in linea_lower or "solucion de controversias" in linea_lower:
                        section_title = "solucion_controversias"
                        break

                # =========================
                # PAGE-FIRST
                # =========================

                if len(page_text) <= min_chars_para_rechunk:
                    chunk_text = page_text.strip()

                    if len(chunk_text) >= min_chars_chunk_util:
                        chunk_id = (
                            os.path.splitext(source_file)[0]
                            + f"__p{page_num}_p{page_num}__c{chunk_index_global}"
                        )

                        registro = {
                            "chunk_id": chunk_id,
                            "document_id": document_id,
                            "source_file": source_file,
                            "source_path": source_path,
                            "relative_path": ruta_relativa,
                            "doc_class": doc_class,
                            "page_start": page_num,
                            "page_end": page_num,
                            "chunk_index": chunk_index_global,
                            "section_title": section_title,
                            "char_count": len(chunk_text),
                            "text": chunk_text,
                            "ingested_at": fecha_ingesta
                        }

                        with open(ruta_chunks_out, "a", encoding="utf-8") as f:
                            f.write(json.dumps(registro, ensure_ascii=False) + "\n")

                        chunk_index_global += 1
                        chunks_generados_este_doc += 1
                        total_chunks += 1

                    continue

                # =========================
                # RECHUNK POR PÁRRAFOS + OVERLAP
                # =========================

                parrafos = re.split(r"\n\s*\n", page_text)
                parrafos = [p.strip() for p in parrafos if p.strip()]

                if len(parrafos) == 0:
                    parrafos = [page_text]

                chunk_actual = ""
                subchunks_pagina = []

                for parrafo in parrafos:
                    if not chunk_actual:
                        chunk_actual = parrafo
                        continue

                    texto_candidato = chunk_actual + "\n\n" + parrafo

                    if len(texto_candidato) <= max_chars_por_chunk:
                        chunk_actual = texto_candidato
                    else:
                        subchunks_pagina.append(chunk_actual.strip())

                        overlap_text = chunk_actual[-overlap_chars:] if len(chunk_actual) > overlap_chars else chunk_actual
                        chunk_actual = overlap_text + "\n\n" + parrafo

                if chunk_actual.strip():
                    subchunks_pagina.append(chunk_actual.strip())

                subchunks_finales = []
                for sc in subchunks_pagina:
                    if len(sc) < min_chars_chunk_util and len(subchunks_finales) > 0:
                        subchunks_finales[-1] = subchunks_finales[-1] + "\n\n" + sc
                    else:
                        subchunks_finales.append(sc)

                subchunk_local_index = 0

                for subchunk in subchunks_finales:
                    subchunk = subchunk.strip()
                    if len(subchunk) < min_chars_chunk_util:
                        continue

                    chunk_id = (
                        os.path.splitext(source_file)[0]
                        + f"__p{page_num}_p{page_num}__c{chunk_index_global}"
                    )

                    registro = {
                        "chunk_id": chunk_id,
                        "document_id": document_id,
                        "source_file": source_file,
                        "source_path": source_path,
                        "relative_path": ruta_relativa,
                        "doc_class": doc_class,
                        "page_start": page_num,
                        "page_end": page_num,
                        "chunk_index": chunk_index_global,
                        "subchunk_index_in_page": subchunk_local_index,
                        "section_title": section_title,
                        "char_count": len(subchunk),
                        "text": subchunk,
                        "ingested_at": fecha_ingesta
                    }

                    with open(ruta_chunks_out, "a", encoding="utf-8") as f:
                        f.write(json.dumps(registro, ensure_ascii=False) + "\n")

                    chunk_index_global += 1
                    subchunk_local_index += 1
                    chunks_generados_este_doc += 1
                    total_chunks += 1

            # =========================
            # LOG OK
            # =========================

            with open(ruta_log, "a", encoding="utf-8-sig") as f:
                f.write(
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    + ";"
                    + ruta_txt.replace(";", ",")
                    + ";"
                    + document_id
                    + ";"
                    + doc_class
                    + ";"
                    + str(chunks_generados_este_doc)
                    + ";ok;"
                    + "procesado"
                    + "\n"
                )

            print(f"[OK] {ruta_txt} -> {chunks_generados_este_doc} chunks")

        except Exception as e:
            total_error += 1

            with open(ruta_log, "a", encoding="utf-8-sig") as f:
                f.write(
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    + ";"
                    + ruta_txt.replace(";", ",")
                    + ";"
                    + document_id
                    + ";"
                    + "error"
                    + ";0;error;"
                    + str(e).replace(";", ",")
                    + "\n"
                )

            print(f"[ERROR] {ruta_txt} -> {e}")

# =========================
# RESUMEN
# =========================

print("\n=========================")
print("RESUMEN CHUNKS")
print("=========================")
print("TXT procesados:", total_txt)
print("Chunks generados:", total_chunks)
print("Errores:", total_error)
print("Salida JSONL:", ruta_chunks_out)
print("Log:", ruta_log)