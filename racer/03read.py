import os
import csv
from datetime import datetime
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

# =========================
# CONFIGURACIÓN
# =========================

ruta_pdf_in = os.path.join(os.getcwd(), "02PDFin")
ruta_txt_out = os.path.join(os.getcwd(), "04TXTout")
os.makedirs(ruta_txt_out, exist_ok=True)

extensiones_pdf = [".pdf"]

# Ruta a tesseract en Windows
# Cambia esto si lo tienes en otra ubicación
pytesseract.pytesseract.tesseract_cmd = r"C:\Users\DeSanto\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"

# OCR idioma
idioma_ocr = "spa"

# Umbrales
umbral_texto_pagina = 30       # si una página tiene menos de esto, se considera candidata a OCR
umbral_texto_documento = 100   # solo informativo para log / clasificación general

# DPI para render OCR
dpi_ocr = 300

# Si True, usa OCR solo cuando la página esté casi vacía
# Si False, además concatena OCR aunque haya texto (más lento y más ruido)
ocr_solo_si_falta_texto = True

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
            "detalle",
            "metodo_documento",
            "largo_texto",
            "paginas_totales",
            "paginas_con_texto",
            "paginas_con_ocr",
            "paginas_vacias"
        ])

total_encontrados = 0
total_generados = 0
total_omitidos = 0
total_error = 0

# =========================
# FUNCIONES AUXILIARES
# =========================

def limpiar_texto(texto):
    if texto is None:
        return ""
    texto = texto.replace("\x00", " ")
    texto = texto.replace("\r", "\n")
    texto = "\n".join([linea.rstrip() for linea in texto.splitlines()])
    return texto.strip()

def hacer_ocr_pagina(pagina, dpi=300, idioma="spa"):
    # Renderizar página a imagen
    matriz = fitz.Matrix(dpi / 72, dpi / 72)
    pix = pagina.get_pixmap(matrix=matriz, alpha=False)

    img_bytes = pix.tobytes("png")
    img = Image.open(io.BytesIO(img_bytes))

    # OCR
    texto_ocr = pytesseract.image_to_string(img, lang=idioma)
    return limpiar_texto(texto_ocr)

def pagina_probablemente_escaneada(pagina, texto_extraido):
    """
    Heurística simple:
    - poco texto extraído
    - y/o presencia de imágenes
    """
    texto_limpio = limpiar_texto(texto_extraido)

    if len(texto_limpio) >= umbral_texto_pagina:
        return False

    imagenes = pagina.get_images(full=True)
    if len(imagenes) > 0:
        return True

    # aunque no detecte imágenes, si no hay texto igual conviene intentar OCR
    return True

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
            doc = fitz.open(ruta_pdf)

            paginas_totales = len(doc)
            paginas_con_texto = 0
            paginas_con_ocr = 0
            paginas_vacias = 0

            bloques_documento = []
            hubo_texto_directo = False
            hubo_ocr = False

            for i, pagina in enumerate(doc):
                texto_pagina = limpiar_texto(pagina.get_text("text"))
                usar_ocr = pagina_probablemente_escaneada(pagina, texto_pagina)

                texto_final_pagina = ""
                metodo_pagina = ""

                if not usar_ocr:
                    texto_final_pagina = texto_pagina
                    metodo_pagina = "texto"
                    paginas_con_texto += 1
                    hubo_texto_directo = True

                else:
                    if ocr_solo_si_falta_texto:
                        texto_ocr = hacer_ocr_pagina(pagina, dpi=dpi_ocr, idioma=idioma_ocr)

                        if len(texto_ocr) > 0:
                            texto_final_pagina = texto_ocr
                            metodo_pagina = "ocr"
                            paginas_con_ocr += 1
                            hubo_ocr = True
                        elif len(texto_pagina) > 0:
                            texto_final_pagina = texto_pagina
                            metodo_pagina = "texto_residual"
                            paginas_con_texto += 1
                            hubo_texto_directo = True
                        else:
                            texto_final_pagina = ""
                            metodo_pagina = "vacia"
                            paginas_vacias += 1
                    else:
                        texto_ocr = hacer_ocr_pagina(pagina, dpi=dpi_ocr, idioma=idioma_ocr)

                        if len(texto_pagina) > 0 and len(texto_ocr) > 0:
                            texto_final_pagina = texto_pagina + "\n\n[OCR]\n" + texto_ocr
                            metodo_pagina = "texto+ocr"
                            paginas_con_texto += 1
                            paginas_con_ocr += 1
                            hubo_texto_directo = True
                            hubo_ocr = True
                        elif len(texto_ocr) > 0:
                            texto_final_pagina = texto_ocr
                            metodo_pagina = "ocr"
                            paginas_con_ocr += 1
                            hubo_ocr = True
                        elif len(texto_pagina) > 0:
                            texto_final_pagina = texto_pagina
                            metodo_pagina = "texto"
                            paginas_con_texto += 1
                            hubo_texto_directo = True
                        else:
                            texto_final_pagina = ""
                            metodo_pagina = "vacia"
                            paginas_vacias += 1

                bloque = []
                bloque.append(f"===== PAGINA {i+1} =====")
                bloque.append(f"[METODO: {metodo_pagina}]")
                bloque.append("")
                bloque.append(texto_final_pagina)

                bloques_documento.append("\n".join(bloque))

            doc.close()

            texto_total = "\n\n".join(bloques_documento)
            texto_limpio = limpiar_texto(texto_total)

            if hubo_texto_directo and hubo_ocr:
                metodo_documento = "mixto"
            elif hubo_ocr:
                metodo_documento = "ocr"
            elif hubo_texto_directo:
                metodo_documento = "texto"
            else:
                metodo_documento = "vacio"

            with open(ruta_txt, mode="w", encoding="utf-8") as f:
                f.write(texto_limpio)

            total_generados += 1

            detalle = f"largo={len(texto_limpio)}"
            if len(texto_limpio) < umbral_texto_documento:
                detalle += " | documento_con_poco_texto"

            with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_pdf,
                    ruta_txt,
                    "ok",
                    detalle,
                    metodo_documento,
                    len(texto_limpio),
                    paginas_totales,
                    paginas_con_texto,
                    paginas_con_ocr,
                    paginas_vacias
                ])

            print(f"[TXT OK] {ruta_pdf} | metodo={metodo_documento}")

        except Exception as e:
            total_error += 1

            with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_pdf,
                    ruta_txt,
                    "error",
                    str(e),
                    "",
                    "",
                    "",
                    "",
                    "",
                    ""
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