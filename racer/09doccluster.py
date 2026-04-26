import os
import json
import csv
import math
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from collections import Counter

# =========================
# CONFIGURACIÓN
# =========================

BASE_DIR = Path.cwd()

RUTA_DOCUMENTS_JSONL = BASE_DIR / "06Documents" / "documents.jsonl"
RUTA_OUT_DIR = BASE_DIR / "09Clusters"
RUTA_OUT_JSONL = RUTA_OUT_DIR / "doc_clusters.jsonl"
RUTA_OUT_CSV = RUTA_OUT_DIR / "doc_clusters.csv"

MODELO_EMBED = "text-embedding-3-small"

def choose_k(n_docs: int, n_folders: int = 5) -> int:
    k_sqrt = int(np.sqrt(n_docs))
    # No bajar del número de categorías naturales que ya conoces
    k = max(n_folders, min(k_sqrt, 12))
    return k

# Para subclústers:
# si un macroclúster tiene menos de este número de docs, no se subdivide
MIN_DOCS_FOR_SUBCLUSTER = 4

# cantidad máxima de subclústers por macro
MAX_SUBCLUSTERS = 4

# =========================
# OPENAI
# =========================

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("No se encontró OPENAI_API_KEY en .env")

client = OpenAI(api_key=api_key)

# =========================
# HELPERS
# =========================

STOPWORDS_ES = {
    "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con",
    "contra", "cual", "cuales", "cuando", "de", "del", "desde", "donde", "dos",
    "el", "ella", "ellas", "ellos", "en", "entre", "era", "eran", "eres", "es",
    "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estado", "está",
    "estas", "este", "esto", "estos", "fue", "fueron", "ha", "han", "hasta",
    "hay", "la", "las", "le", "les", "lo", "los", "más", "me", "mi", "mis",
    "mucho", "muy", "no", "nos", "nosotros", "o", "os", "otra", "otras", "otro",
    "otros", "para", "pero", "poco", "por", "porque", "que", "quien", "quienes",
    "se", "sea", "ser", "si", "sí", "sin", "sobre", "son", "soy", "su", "sus",
    "también", "te", "tenemos", "tener", "tengo", "ti", "tiene", "tienen", "todo",
    "tu", "tus", "un", "una", "uno", "unos", "y", "ya"
}

STOPWORDS_EXTRA = {
    "pagina", "página", "pag", "txt", "pdf", "s.a", "s.a.", "sa",
    "certificado", "certificación", "certificaciones",
    "servicios", "aplicación", "aplicaciones",
    "documento", "empresa", "archivo", "metodo", "ocr", "texto"
}

# 1. Agregar stopwords EN + PT
STOPWORDS_EN = {
    "the", "and", "for", "with", "this", "that", "are", "from",
    "has", "have", "been", "will", "its", "not", "all", "but",
    "by", "or", "as", "at", "be", "it", "in", "of", "to", "is"
}

STOPWORDS_PT = {
    "que", "com", "por", "para", "uma", "dos", "das", "nas",
    "nos", "pelo", "pela", "aos", "ser", "seu", "sua", "mais",
    "foi", "tem", "são", "não", "como", "também", "sobre"
}

STOPWORDS_ES = STOPWORDS_ES | STOPWORDS_EXTRA | STOPWORDS_EN | STOPWORDS_PT

def normalize_text(text: str) -> str:
    text = str(text or "").lower()
    text = text.replace("\n", " ")
    out = []
    for ch in text:
        if ch.isalnum() or ch in " áéíóúüñçãõàèìòùâêîôû-_/.":
            out.append(ch)
        else:
            out.append(" ")
    text = "".join(out)
    text = " ".join(text.split())
    return text.strip()

def tokenize(text: str):
    tokens = normalize_text(text).split()
    return [t for t in tokens if len(t) >= 3 and t not in STOPWORDS_ES]

def safe_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default

def l2_normalize_matrix(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms

def cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    # asume filas ya normalizadas
    return a @ b.T

def choose_k_by_size(n_docs: int, max_k: int = 4) -> int:
    if n_docs < 4:
        return 1
    if n_docs < 8:
        return min(2, max_k)
    if n_docs < 15:
        return min(3, max_k)
    return min(4, max_k)

def kmeans_numpy(X: np.ndarray, k: int, max_iter: int = 40, seed: int = 42):
    """
    KMeans simple con numpy.
    X: (n, d)
    """
    n = X.shape[0]
    if n == 0:
        return np.array([], dtype=int), np.empty((0, X.shape[1]))
    if k <= 1 or n == 1:
        return np.zeros(n, dtype=int), np.mean(X, axis=0, keepdims=True)
    if k > n:
        k = n

    rng = np.random.default_rng(seed)
    init_idx = rng.choice(n, size=k, replace=False)
    centroids = X[init_idx].copy()

    labels = np.zeros(n, dtype=int)

    for _ in range(max_iter):
        sims = cosine_similarity_matrix(X, l2_normalize_matrix(centroids))
        new_labels = np.argmax(sims, axis=1)

        if np.array_equal(new_labels, labels):
            break

        labels = new_labels

        new_centroids = []
        for j in range(k):
            pts = X[labels == j]
            if len(pts) == 0:
                new_centroids.append(X[rng.integers(0, n)])
            else:
                new_centroids.append(np.mean(pts, axis=0))
        centroids = np.vstack(new_centroids)

    return labels, centroids

BAD_LABEL_TERMS = {
    # basura OCR
    "pagina", "página", "pag", "txt", "pdf",
    "metodo", "ocr", "texto",

    # empresas genéricas
    "sonda", "s.a", "s.a.", "sa", "ltda", "empresa",

    # palabras demasiado genéricas
    "certificado", "certificación", "servicios", "aplicación", "documento",

    # firmas / apostillas / nombres (tu problema actual)
    "public", "juan", "san", "urrejola", "martin",
    "notario", "firma", "certifica", "certifico", "apostilla", "apostillado"
}

def top_terms_for_docs(docs, max_terms=6):
    counter = Counter()
    for d in docs:
        text = " ".join([
            str(d.get("title_guess", "")),
            str(d.get("doc_class", "")),
            " ".join(d.get("topics", [])) if isinstance(d.get("topics", []), list) else str(d.get("topics", "")),
            " ".join(d.get("key_entities", [])) if isinstance(d.get("key_entities", []), list) else str(d.get("key_entities", "")),
            str(d.get("summary_dense", d.get("summary", ""))),
            str(d.get("retrieval_text", "")),
        ])
        counter.update(tokenize(text))

    common = []
    for term, freq in counter.most_common(50):
        if term in BAD_LABEL_TERMS:
            continue
        if len(term) >= 3:
            common.append(term)
        if len(common) >= max_terms:
            break
    return common

def make_cluster_label(docs, prefix: str):
    terms = top_terms_for_docs(docs, max_terms=5)
    if not terms:
        return prefix
    return f"{prefix}: " + ", ".join(terms)

def build_text_for_embedding(obj: dict) -> str:
    title_guess = str(obj.get("title_guess", "") or "")
    doc_class = str(obj.get("doc_class", "") or "")
    summary_dense = str(obj.get("summary_dense", obj.get("summary", "")) or "")

    # Extraer categoría desde la ruta relativa
    relative_path = str(obj.get("relative_path", "") or "")
    path_parts = Path(relative_path).parts
    folder_context = " / ".join(path_parts[:-1]) if len(path_parts) > 1 else ""

    topics = obj.get("topics", [])
    if not isinstance(topics, list):
        topics = []
    topics = [str(x).strip() for x in topics if str(x).strip()]

    key_entities = obj.get("key_entities", [])
    if not isinstance(key_entities, list):
        key_entities = []
    key_entities = [str(x).strip() for x in key_entities if str(x).strip()]

    likely_queries = obj.get("likely_queries", [])
    if not isinstance(likely_queries, list):
        likely_queries = []
    likely_queries = [str(x).strip() for x in likely_queries if str(x).strip()]

    partes = [
        f"TITULO: {title_guess}",
        f"TIPO: {doc_class}",
        f"CARPETA: {folder_context}",
        f"RESUMEN: {summary_dense}",
        f"TEMAS: {', '.join(topics)}",
        f"ENTIDADES: {', '.join(key_entities)}",
        f"CONSULTAS: {' | '.join(likely_queries)}",
    ]
    return "\n".join(partes).strip()

def get_embeddings_batch(texts, batch_size=64):
    vectors = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        resp = client.embeddings.create(
            model=MODELO_EMBED,
            input=batch
        )
        batch_vecs = [np.array(item.embedding, dtype=np.float32) for item in resp.data]
        vectors.extend(batch_vecs)
        print(f"Embeddings: {min(i + batch_size, len(texts))}/{len(texts)}")
    return vectors

# =========================
# MAIN
# =========================

def main():
    if not RUTA_DOCUMENTS_JSONL.exists():
        raise FileNotFoundError(f"No existe: {RUTA_DOCUMENTS_JSONL}")

    RUTA_OUT_DIR.mkdir(parents=True, exist_ok=True)

    docs = []
    with open(RUTA_DOCUMENTS_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)

            document_id = str(obj.get("document_id", "") or "")
            if not document_id:
                continue

            texto_embed = build_text_for_embedding(obj)

            registro = {
                "document_id": document_id,
                "source_file": str(obj.get("source_file", "") or ""),
                "relative_path": str(obj.get("relative_path", "") or ""),
                "source_path": str(obj.get("source_path", "") or ""),
                "doc_class": str(obj.get("doc_class", "") or ""),
                "title_guess": str(obj.get("title_guess", "") or ""),
                "summary": str(obj.get("summary", "") or ""),
                "summary_dense": str(obj.get("summary_dense", obj.get("summary", "")) or ""),
                "topics": obj.get("topics", []) if isinstance(obj.get("topics", []), list) else [],
                "key_entities": obj.get("key_entities", []) if isinstance(obj.get("key_entities", []), list) else [],
                "likely_queries": obj.get("likely_queries", []) if isinstance(obj.get("likely_queries", []), list) else [],
                "retrieval_text": str(obj.get("retrieval_text", "") or ""),
                "page_count": safe_int(obj.get("page_count", 0)),
                "char_count": safe_int(obj.get("char_count", 0)),
                "text_for_embedding": texto_embed,
            }
            docs.append(registro)

    if not docs:
        raise ValueError("No se encontraron documentos válidos en documents.jsonl")

    print(f"Documentos leídos: {len(docs)}")

    # Fix 3: Filtrar docs vacíos o con OCR fallido
    MIN_CHARS = 80  # o 0 si quieres no filtrar nada

    docs_validos = []
    docs_vacios = []

    for d in docs:
        texto_real = " ".join([
            str(d.get("title_guess", "") or ""),
            str(d.get("summary_dense", "") or ""),
            str(d.get("summary", "") or ""),
            str(d.get("retrieval_text", "") or ""),
            " ".join(d.get("topics", [])) if isinstance(d.get("topics", []), list) else "",
            " ".join(d.get("key_entities", [])) if isinstance(d.get("key_entities", []), list) else "",
            " ".join(d.get("likely_queries", [])) if isinstance(d.get("likely_queries", []), list) else "",
        ]).strip()

        d["char_count"] = len(texto_real)

        if d["char_count"] >= MIN_CHARS:
            docs_validos.append(d)
        else:
            docs_vacios.append(d)

    docs = docs_validos

    print(f"Docs válidos para clustering: {len(docs)}")
    print(f"Docs ignorados (vacíos/OCR fallido): {len(docs_vacios)}")

    if not docs:
        raise ValueError("No hay documentos con suficiente contenido para clustering")

    textos = [d["text_for_embedding"] for d in docs]
    vectors = get_embeddings_batch(textos, batch_size=64)

    X = np.vstack(vectors)
    X = l2_normalize_matrix(X)

    # =========
    # Macroclústers
    # =========

    # Fix 4: Usar estructura de carpetas como piso mínimo para k
    top_folders = set()
    for d in docs:
        parts = Path(d["relative_path"]).parts
        if len(parts) > 1:
            top_folders.add(parts[0])

    n_folders = max(len(top_folders), 5)

    best_k = choose_k(len(docs), n_folders=n_folders)
    print(f"Carpetas top-level detectadas: {n_folders} → k={best_k}")

    macro_labels, _ = kmeans_numpy(X, best_k)

    macro_groups = defaultdict(list)
    for i, label in enumerate(macro_labels):
        macro_groups[int(label)].append(i)

    macro_info = {}
    for macro_id, idxs in macro_groups.items():
        group_docs = [docs[i] for i in idxs]
        macro_info[macro_id] = {
            "size": len(idxs),
            "label": make_cluster_label(group_docs, prefix=f"macro_{macro_id}")
        }

    # =========
    # Subclústers dentro de cada macro
    # =========

    final_records = []

    for macro_id, idxs in macro_groups.items():
        X_sub = X[idxs]
        group_docs = [docs[i] for i in idxs]

        if len(group_docs) < MIN_DOCS_FOR_SUBCLUSTER:
            sub_labels = np.zeros(len(group_docs), dtype=int)
            sub_k = 1
        else:
            sub_k = choose_k_by_size(len(group_docs), max_k=MAX_SUBCLUSTERS)
            sub_labels, _ = kmeans_numpy(X_sub, sub_k, max_iter=40, seed=100 + macro_id)

        sub_groups = defaultdict(list)
        for local_i, sub_id in enumerate(sub_labels):
            sub_groups[int(sub_id)].append(local_i)

        sub_info = {}
        for sub_id, local_idxs in sub_groups.items():
            sub_docs = [group_docs[j] for j in local_idxs]
            sub_info[sub_id] = {
                "size": len(local_idxs),
                "label": make_cluster_label(
                    sub_docs,
                    prefix=f"macro_{macro_id}_sub_{sub_id}"
                )
            }

        for local_i, doc in enumerate(group_docs):
            sub_id = int(sub_labels[local_i])

            record = {
                "document_id": doc["document_id"],
                "source_file": doc["source_file"],
                "relative_path": doc["relative_path"],
                "source_path": doc["source_path"],
                "doc_class": doc["doc_class"],
                "title_guess": doc["title_guess"],
                "summary_dense": doc["summary_dense"],
                "topics": doc["topics"],
                "key_entities": doc["key_entities"],
                "likely_queries": doc["likely_queries"],
                "retrieval_text": doc["retrieval_text"],
                "page_count": doc["page_count"],
                "char_count": doc["char_count"],

                "cluster_l1": int(macro_id),
                "cluster_l1_size": int(macro_info[macro_id]["size"]),
                "cluster_l1_label": macro_info[macro_id]["label"],

                "cluster_l2": int(sub_id),
                "cluster_l2_size": int(sub_info[sub_id]["size"]),
                "cluster_l2_label": sub_info[sub_id]["label"],
            }
            final_records.append(record)

    # ordenar por cluster y nombre
    final_records.sort(
        key=lambda x: (
            x["cluster_l1"],
            x["cluster_l2"],
            x["source_file"].lower()
        )
    )

    # =========
    # Guardar JSONL
    # =========

    with open(RUTA_OUT_JSONL, "w", encoding="utf-8") as f:
        for rec in final_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # =========
    # Guardar CSV
    # =========

    fieldnames = [
        "document_id",
        "source_file",
        "relative_path",
        "doc_class",
        "title_guess",
        "cluster_l1",
        "cluster_l1_size",
        "cluster_l1_label",
        "cluster_l2",
        "cluster_l2_size",
        "cluster_l2_label",
        "page_count",
        "char_count",
        "summary_dense",
    ]

    with open(RUTA_OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        for rec in final_records:
            row = {k: rec.get(k, "") for k in fieldnames}
            writer.writerow(row)

    # =========
    # Resumen en consola
    # =========

    print("\n==============================")
    print("RESUMEN DE CLUSTERS")
    print("==============================")
    print("Total documentos:", len(final_records))
    print("Macroclústers:", len(set(r["cluster_l1"] for r in final_records)))

    macro_counter = Counter(r["cluster_l1"] for r in final_records)
    for macro_id, count in sorted(macro_counter.items()):
        label = next(r["cluster_l1_label"] for r in final_records if r["cluster_l1"] == macro_id)
        print(f"- Macro {macro_id}: {count} docs | {label}")

    print("\nArchivos generados:")
    print("-", RUTA_OUT_JSONL)
    print("-", RUTA_OUT_CSV)

if __name__ == "__main__":
    main()