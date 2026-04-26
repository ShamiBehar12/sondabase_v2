import re
import math
from typing import List, Dict, Any

STOPWORDS_ES = {
    "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con",
    "contra", "cual", "cuales", "cuando", "de", "del", "desde", "donde", "dos",
    "el", "ella", "ellas", "ellos", "en", "entre", "era", "erais", "eran",
    "eras", "eres", "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba",
    "estabais", "estaban", "estabas", "estad", "estada", "estadas", "estado",
    "estados", "estais", "estamos", "estan", "estando", "estar", "estaremos",
    "estará", "estarán", "estarás", "estaré", "estaréis", "estaría", "estaríais",
    "estaríamos", "estarían", "estarías", "estas", "este", "estemos", "esto",
    "estos", "estoy", "fue", "fuera", "fuerais", "fueran", "fueras", "fueron",
    "fui", "fuimos", "ha", "habéis", "haber", "había", "habíais", "habíamos",
    "habían", "habías", "han", "has", "hasta", "hay", "la", "las", "le", "les",
    "lo", "los", "más", "me", "mi", "mis", "mucho", "muy", "no", "nos", "nosotros",
    "o", "os", "otra", "otras", "otro", "otros", "para", "pero", "poco", "por",
    "porque", "que", "quien", "quienes", "se", "sea", "sean", "ser", "si", "sí",
    "sin", "sobre", "sois", "somos", "son", "soy", "su", "sus", "también", "te",
    "tenéis", "tenemos", "tener", "tengo", "ti", "tiene", "tienen", "todo", "tu",
    "tus", "un", "una", "uno", "unos", "y", "ya"
}

def _normalize(text: str) -> str:
    text = str(text or "").lower()
    text = text.replace("\n", " ")
    text = re.sub(r"[^\wáéíóúüñçãõàèìòùâêîôû\-\/ ]+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _tokenize(text: str) -> List[str]:
    text = _normalize(text)
    tokens = text.split()
    return [t for t in tokens if len(t) >= 2 and t not in STOPWORDS_ES]

def _safe_float(x, default=9999.0) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except Exception:
        return default

def _semantic_score_from_distance(distance: float, min_d: float, max_d: float) -> float:
    if max_d <= min_d:
        return 1.0
    norm = (distance - min_d) / (max_d - min_d)
    return max(0.0, 1.0 - norm)

def _lexical_overlap_score(query_tokens: List[str], text_tokens: List[str]) -> float:
    if not query_tokens or not text_tokens:
        return 0.0
    qset = set(query_tokens)
    tset = set(text_tokens)
    inter = len(qset.intersection(tset))
    return inter / max(1, len(qset))

def _phrase_bonus(query_norm: str, text_norm: str) -> float:
    if not query_norm or not text_norm:
        return 0.0
    bonus = 0.0
    if query_norm in text_norm:
        bonus += 0.35
    query_parts = [p.strip() for p in re.split(r"[,:;\-\/\?\.\!]", query_norm) if p.strip()]
    for part in query_parts:
        if len(part) >= 10 and part in text_norm:
            bonus += 0.10
    return min(bonus, 0.50)

def _metadata_bonus(query_tokens: List[str], metadata: Dict[str, Any]) -> float:
    fields = [
        metadata.get("source_file", ""),
        metadata.get("title_guess", ""),
        metadata.get("section_title", ""),
        metadata.get("doc_class", ""),
        metadata.get("topics", "")
    ]
    meta_text = " ".join(str(x or "") for x in fields)
    meta_tokens = set(_tokenize(meta_text))
    if not query_tokens or not meta_tokens:
        return 0.0
    hits = len(set(query_tokens).intersection(meta_tokens))
    return min(0.20, 0.05 * hits)

def rerank_results(query: str, results: Dict[str, Any], top_n: int = 8) -> List[Dict[str, Any]]:
    ids = (results.get("ids") or [[]])[0]
    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    if not ids:
        return []

    query_norm = _normalize(query)
    query_tokens = _tokenize(query)

    valid_distances = [_safe_float(d) for d in distances] if distances else [1.0] * len(ids)
    min_d = min(valid_distances) if valid_distances else 0.0
    max_d = max(valid_distances) if valid_distances else 1.0

    reranked = []

    for i in range(len(ids)):
        item_id = ids[i]
        doc = str(docs[i] if i < len(docs) else "")
        meta = metas[i] if i < len(metas) and isinstance(metas[i], dict) else {}
        dist = _safe_float(distances[i] if i < len(distances) else 9999.0)

        text_norm = _normalize(doc)
        text_tokens = _tokenize(doc)

        semantic = _semantic_score_from_distance(dist, min_d, max_d)
        lexical = _lexical_overlap_score(query_tokens, text_tokens)
        phrase = _phrase_bonus(query_norm, text_norm)
        meta_b = _metadata_bonus(query_tokens, meta)

        short_text_penalty = 0.0
        if len(doc.strip()) < 120:
            short_text_penalty = 0.08

        score = (
            0.55 * semantic +
            0.30 * lexical +
            phrase +
            meta_b -
            short_text_penalty
        )

        reranked.append({
            "id": item_id,
            "document": doc,
            "metadata": meta,
            "distance": dist,
            "semantic_score": round(semantic, 4),
            "lexical_score": round(lexical, 4),
            "phrase_bonus": round(phrase, 4),
            "metadata_bonus": round(meta_b, 4),
            "final_score": round(score, 4)
        })

    reranked.sort(key=lambda x: x["final_score"], reverse=True)
    return reranked[:top_n]