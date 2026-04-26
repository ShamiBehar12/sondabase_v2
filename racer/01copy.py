import os
import shutil
import csv
from datetime import datetime

# =========================
# CONFIGURACIÓN
# =========================

ruta_origen = r"C:\Users\jdelossantos\OneDrive - Sonda S.A\Archivos de Moniz Branco, Marco Alexandre - 13- Contratos y Certificados"
ruta_destino = r"C:\Users\jdelossantos\Desktop\RACER\02PDFin"

# True = copia solo PDFs
# False = copia todos los archivos
solo_pdfs = False

# True = crea carpetas espejo dentro del destino
mantener_estructura = True

# =========================
# PREPARACIÓN
# =========================

os.makedirs(ruta_destino, exist_ok=True)

ruta_log = os.path.join(ruta_destino, "log_copia.csv")

if not os.path.exists(ruta_log):
    with open(ruta_log, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow([
            "fecha_hora",
            "archivo_origen",
            "archivo_destino",
            "estado",
            "detalle"
        ])

# =========================
# COPIA
# =========================

total_encontrados = 0
total_copiados = 0
total_omitidos = 0
total_error = 0

for raiz, carpetas, archivos in os.walk(ruta_origen):
    for nombre_archivo in archivos:
        ruta_archivo_origen = os.path.join(raiz, nombre_archivo)

        if solo_pdfs and not nombre_archivo.lower().endswith(".pdf"):
            continue

        total_encontrados += 1

        if mantener_estructura:
            ruta_relativa = os.path.relpath(raiz, ruta_origen)
            carpeta_destino_actual = os.path.join(ruta_destino, ruta_relativa)
        else:
            carpeta_destino_actual = ruta_destino

        os.makedirs(carpeta_destino_actual, exist_ok=True)

        ruta_archivo_destino = os.path.join(carpeta_destino_actual, nombre_archivo)

        try:
            if os.path.exists(ruta_archivo_destino):
                tam_origen = os.path.getsize(ruta_archivo_origen)
                tam_destino = os.path.getsize(ruta_archivo_destino)

                if tam_origen == tam_destino:
                    total_omitidos += 1
                    with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                        writer = csv.writer(f, delimiter=";")
                        writer.writerow([
                            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            ruta_archivo_origen,
                            ruta_archivo_destino,
                            "omitido",
                            "ya existía con mismo tamaño"
                        ])
                    print(f"[OMITIDO] {ruta_archivo_origen}")
                    continue

            shutil.copy2(ruta_archivo_origen, ruta_archivo_destino)
            total_copiados += 1

            with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_archivo_origen,
                    ruta_archivo_destino,
                    "copiado",
                    "ok"
                ])

            print(f"[COPIADO] {ruta_archivo_origen}")

        except Exception as e:
            total_error += 1

            with open(ruta_log, mode="a", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, delimiter=";")
                writer.writerow([
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    ruta_archivo_origen,
                    ruta_archivo_destino,
                    "error",
                    str(e)
                ])

            print(f"[ERROR] {ruta_archivo_origen} -> {e}")

# =========================
# RESUMEN
# =========================

print("\n=========================")
print("RESUMEN")
print("=========================")
print("Archivos encontrados:", total_encontrados)
print("Archivos copiados:", total_copiados)
print("Archivos omitidos:", total_omitidos)
print("Errores:", total_error)
print("Destino:", ruta_destino)
print("Log:", ruta_log)