import os
import csv
from datetime import datetime
import fitz  # PyMuPDF

# =========================
# CONFIGURACIÓN
# =========================

ruta_pdf_in = os.path.join(os.getcwd(), "02PDFin")
ruta_txt_out = os.path.join(os.getcwd(), "04TXTout")
os.makedirs(ruta_txt_out, exist_ok=True)

extensiones_pdf = [".pdf"]

# =========================
# PREPARACIÓN
# =========================

os.makedirs(ruta_txt_out, exist_ok=True)

ruta_log = os.path.join(ruta_txt_out, "log_txt.csv")

if not os.path.exists(ruta_log):
    with open(ruta_log, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow([
            "fecha_hora",
            "archivo_pdf",
            "archivo_txt",
            "estado",
            "detalle"
        ])

total_encontrados = 0
total_generados = 0
total_omitidos = 0
total_error = 0

# =========================
# RECORRER PDFs
# =========================

for raiz, carpetas, archivos in os.walk(ruta_pdf_in):
    for nombre_archivo in archivos:
        extension = os.path.splitext(nombre_archivo)[1].lower()

        if extension not in extensiones_pdf:
            continue

        total_encontrados += 1

        ruta_pdf = os.path.join(raiz, nombre_archivo)

        ruta_relativa = os.path.relpath(raiz, ruta_pdf_in)
        carpeta_destino_actual = os.path.join(ruta_txt_out, ruta_relativa)
        os.makedirs(carpeta_destino_actual, exist_ok=True)

        nombre_txt = os.path.splitext(nombre_archivo)[0] + ".txt"
        ruta_txt = os.path.join(carpeta_destino_actual, nombre_txt)

        if os.path.exists(ruta_txt):
            total_omitidos += 1
            print(f"[OMITIDO] {ruta_pdf}")
            continue

        try:
            texto_total = ""

            doc = fitz.open(ruta_pdf)

            for i, pagina in enumerate(doc):
                texto_pagina = pagina.get_text("text")

                texto_total += f"\n\n===== PAGINA {i+1} =====\n\n"
                texto_total += texto_pagina

            doc.close()

            texto_limpio = texto_total.strip()

            with open(ruta_txt, mode="w", encoding="utf-8") as f:
                f.write(texto_limpio)

            total_generados += 1

            with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_pdf,
                    ruta_txt,
                    "ok",
                    f"largo={len(texto_limpio)}"
                ])

            print(f"[TXT OK] {ruta_pdf}")

        except Exception as e:
            total_error += 1

            with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_pdf,
                    ruta_txt,
                    "error",
                    str(e)
                ])

            print(f"[ERROR] {ruta_pdf} -> {e}")

# =========================
# RESUMEN
# =========================

print("\n=========================")
print("RESUMEN TXT")
print("=========================")
print("PDFs encontrados:", total_encontrados)
print("TXTs generados:", total_generados)
print("TXTs omitidos:", total_omitidos)
print("Errores:", total_error)
print("Salida TXT:", ruta_txt_out)
print("Log:", ruta_log)