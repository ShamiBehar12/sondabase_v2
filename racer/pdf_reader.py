"""
pdf_reader.py — Extracción de texto de PDFs con OCR fallback.
Lógica basada en 03read.py, refactorizada como módulo reutilizable.
"""
import io
import os
import re
import logging

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

# ── Configuración OCR ─────────────────────────────────────────────────────────────────────────────

UMBRAL_TEXTO_PAGINA = 30    # chars mínimos para considerar que una página tiene texto
DPI_OCR = 300
IDIOMA_OCR = "spa"

def _tesseract_path() -> str | None:
    """Resuelve la ruta a tesseract multiplataforma."""
    import shutil
    # Linux/Mac: usar el que esté en PATH
    found = shutil.which("tesseract")
    if found:
        return found
    # Windows: buscar en LOCALAPPDATA
    local_app = os.environ.get("LOCALAPPDATA")
    if local_app:
        candidate = os.path.join(local_app, "Programs", "Tesseract-OCR", "tesseract.exe")
        if os.path.isfile(candidate):
            return candidate
    return None


def _ocr_available() -> bool:
    """Verifica si pytesseract y Tesseract están disponibles."""
    try:
        import pytesseract
        tess = _tesseract_path()
        if tess:
            pytesseract.pytesseract.tesseract_cmd = tess
        # Test rápido
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


_OCR_READY: bool | None = None


def _ensure_ocr():
    """Inicializa OCR una sola vez. Retorna True si está disponible."""
    global _OCR_READY
    if _OCR_READY is not None:
        return _OCR_READY
    _OCR_READY = _ocr_available()
    if _OCR_READY:
        logger.info("Tesseract OCR disponible")
    else:
        logger.warning("Tesseract OCR no encontrado — solo se extraerá texto nativo de PDFs")
    return _OCR_READY


# ── Funciones auxiliares ───────────────────────────────────────────────────────────────────────────

def _limpiar_texto(texto: str) -> str:
    if not texto:
        return ""
    texto = texto.replace("\x00", " ").replace("\r", "\n")
    texto = "\n".join(linea.rstrip() for linea in texto.splitlines())
    return texto.strip()


def _hacer_ocr_pagina(pagina, dpi: int = DPI_OCR, idioma: str = IDIOMA_OCR) -> str:
    """Renderiza una página fitz como imagen y aplica OCR."""
    import pytesseract
    from PIL import Image

    tess = _tesseract_path()
    if tess:
        pytesseract.pytesseract.tesseract_cmd = tess

    matriz = fitz.Matrix(dpi / 72, dpi / 72)
    pix = pagina.get_pixmap(matrix=matriz, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    texto_ocr = pytesseract.image_to_string(img, lang=idioma)
    return _limpiar_texto(texto_ocr)


def _pagina_necesita_ocr(pagina, texto_extraido: str) -> bool:
    """Heurística: poco texto extraído y/o presencia de imágenes."""
    texto_limpio = _limpiar_texto(texto_extraido)
    if len(texto_limpio) >= UMBRAL_TEXTO_PAGINA:
        return False
    # Si hay imágenes, probablemente es un escaneo
    if pagina.get_images(full=True):
        return True
    # Sin imágenes pero sin texto → intentar OCR de todas formas
    return True


# ── API pública ───────────────────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes, filename: str = "document.pdf") -> str:
    """
    Extrae texto de un PDF en bytes.
    Usa texto nativo (PyMuPDF) y, si está disponible, OCR como fallback
    para páginas con poco contenido textual.

    Returns:
        Texto completo del documento.
    """
    ocr_ready = _ensure_ocr()

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        logger.error(f"No se pudo abrir PDF '{filename}': {e}")
        return ""

    bloques: list[str] = []
    stats = {"texto": 0, "ocr": 0, "vacias": 0}

    for i, pagina in enumerate(doc):
        texto_pagina = _limpiar_texto(pagina.get_text("text"))
        usar_ocr = ocr_ready and _pagina_necesita_ocr(pagina, texto_pagina)

        if not usar_ocr:
            # Texto nativo suficiente
            if texto_pagina:
                bloques.append(texto_pagina)
                stats["texto"] += 1
            else:
                stats["vacias"] += 1
        else:
            # Intentar OCR
            try:
                texto_ocr = _hacer_ocr_pagina(pagina)
                if texto_ocr:
                    bloques.append(texto_ocr)
                    stats["ocr"] += 1
                elif texto_pagina:
                    bloques.append(texto_pagina)
                    stats["texto"] += 1
                else:
                    stats["vacias"] += 1
            except Exception as e:
                logger.warning(f"OCR falló en página {i+1} de '{filename}': {e}")
                if texto_pagina:
                    bloques.append(texto_pagina)
                    stats["texto"] += 1
                else:
                    stats["vacias"] += 1

    doc.close()

    texto_total = "\n\n".join(bloques)
    texto_limpio = _limpiar_texto(texto_total)

    # Normalizar espacios excesivos
    texto_limpio = re.sub(r"\n{3,}", "\n\n", texto_limpio)
    texto_limpio = re.sub(r"[ \t]{2,}", " ", texto_limpio)

    logger.info(
        f"PDF '{filename}': {stats['texto']} pág texto, "
        f"{stats['ocr']} pág OCR, {stats['vacias']} pág vacías, "
        f"{len(texto_limpio)} chars total"
    )

    return texto_limpio
