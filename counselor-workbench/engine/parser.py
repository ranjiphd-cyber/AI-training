"""Best-effort extraction of psychometric data from an uploaded PDF report.

Reports differ in layout, so every extractor is tolerant and returns ``None``
or an empty list when it cannot find a value. The counselor always reviews and
corrects the result in the Candidate Data Matrix.
"""

import io
import re

from .knowledge import APTITUDES, ARCHETYPES, CAREER_CLUSTERS, MOTIVATORS, RIASEC, TRAITS

OWNER_PHONE = "9845051784"


def empty_profile():
    return {
        "name": "", "phone": "", "email": "", "age": "", "report_date": "",
        "careers": ["", "", ""],
        "aptitudes": {k: 5 for k in APTITUDES},
        "motivators": [],
        "riasec_code": "",
        "riasec": {k: 4 for k in RIASEC},
        "riasec_scored": False,
        "archetype": "",
        "traits": [],
        "plus_points": [],
        "blind_spots": [],
    }


def sample_profile():
    """Reference candidate supplied with the brief (Muhammed Saad)."""
    p = empty_profile()
    p.update({
        "name": "Muhammed Saad",
        "careers": ["Agriculture & Natural Resources", "Information Technology", "Science & Research"],
        "aptitudes": {"acuteness": 10, "verbal": 10, "critical": 9, "spatial": 9, "numerical": 6},
        "motivators": ["Interest", "Challenge", "Freedom"],
        "riasec_code": "IRC",
        "archetype": "Commanding Implementer / Opportunist",
        "traits": ["Factual", "Spontaneous", "Assertive", "Gregarious"],
    })
    p["riasec"] = riasec_from_code("IRC")
    p["plus_points"] = [TRAITS[t]["plus"] for t in p["traits"]]
    p["blind_spots"] = [TRAITS[t]["blind"] for t in p["traits"]]
    return p


def riasec_from_code(code):
    """Approximate theme scores from a Holland code when the report gives only letters."""
    scores = {k: 4 for k in RIASEC}
    for value, letter in zip((9, 8, 7), code.upper()):
        if letter in scores:
            scores[letter] = value
    return scores


def extract_text(file_bytes):
    """Return plain text from PDF bytes, trying pdfplumber then pypdf."""
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        text = ""
    if len(text.strip()) < 50:
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            pass
    return text


def _window(text, anchor_pattern, size=900):
    m = re.search(anchor_pattern, text, re.I)
    return text[m.start(): m.start() + size] if m else ""


def _find_name(text):
    m = re.search(r"(?:candidate(?:'s)?\s*name|student\s*name|name\s*of\s*(?:the\s*)?candidate|name)\s*[:\-–]\s*([A-Z][A-Za-z.' ]{2,60})", text, re.I)
    if m:
        return re.split(r"\s{2,}|\b(?:age|phone|mobile|email|date|class|gender)\b", m.group(1).strip(), flags=re.I)[0].strip()
    m = re.search(r"(?:prepared for|report for)\s*[:\-–]?\s*([A-Z][A-Za-z.' ]{2,60})", text, re.I)
    return m.group(1).strip() if m else ""


def _find_phone(text):
    for m in re.finditer(r"(\+?\d[\d \-]{8,14}\d)", text):
        digits = re.sub(r"\D", "", m.group(1))
        if OWNER_PHONE in digits or len(digits) < 10:
            continue
        return m.group(1).strip()
    return ""


def _find_email(text):
    for m in re.finditer(r"[\w.+-]+@[\w-]+\.[\w.-]+", text):
        if "personalityresearch" not in m.group(0).lower():
            return m.group(0)
    return ""


def _find_aptitudes(text):
    found = {}
    for key, meta in APTITUDES.items():
        for alias in meta["aliases"]:
            m = re.search(rf"{alias}[^\n\d]{{0,40}}?(\d{{1,2}}(?:\.\d)?)(?:\s*/\s*10)?", text, re.I)
            if m:
                value = float(m.group(1))
                if 0 < value <= 10:
                    found[key] = int(round(value))
                    break
    return found


def _find_motivators(text):
    region = _window(text, r"motivat", 300) or text
    hits = []
    for word in MOTIVATORS:
        m = re.search(rf"\b{word}\b", region, re.I)
        if m:
            hits.append((m.start(), word))
    return [w for _, w in sorted(hits)][:5]


def _find_riasec(text):
    region = _window(text, r"holland|riasec|interest\s+(?:theme|code|profile)", 1500) or text
    scores = {}
    for letter, meta in RIASEC.items():
        m = re.search(rf"{meta['name']}[^\n\d]{{0,30}}?(\d{{1,3}}(?:\.\d)?)\s*(%)?", region, re.I)
        if m:
            value = float(m.group(1))
            scores[letter] = value / 10 if (m.group(2) or value > 10) else value
    code = ""
    m = re.search(r"\b(?:code|type|theme)s?\s*[:\-–]?\s*([RIASEC]{2,3})\b", region)
    if m:
        code = m.group(1)
    if not code:
        m = re.search(r"\b([RIASEC]{3})\b", region)
        code = m.group(1) if m else ""
    if not code and scores:
        code = "".join(sorted(scores, key=scores.get, reverse=True)[:3])
    if not code:
        order = []
        for letter, meta in RIASEC.items():
            m = re.search(meta["name"], region, re.I)
            if m:
                order.append((m.start(), letter))
        code = "".join(l for _, l in sorted(order)[:3])
    return code, scores


def _find_careers(text):
    hits = []
    for cluster in CAREER_CLUSTERS:
        head = cluster.split(",")[0].split("&")[0].strip()
        m = re.search(re.escape(head), text, re.I)
        if m:
            hits.append((m.start(), cluster))
    return [c for _, c in sorted(hits)][:3]


def _find_archetype(text):
    for name in ARCHETYPES:
        first = name.split("/")[0].strip()
        if re.search(re.escape(first), text, re.I):
            return name
    m = re.search(r"(?:personality|behaviou?ral)\s*(?:type|style|archetype|profile)\s*[:\-–]\s*([A-Z][A-Za-z /]{3,60})", text, re.I)
    return m.group(1).strip() if m else ""


def _find_traits(text):
    return [t for t in TRAITS if re.search(rf"\b{t}\b", text, re.I)][:4]


def _find_list(text, header_pattern):
    region = _window(text, header_pattern, 1200)
    if not region:
        return []
    lines = region.splitlines()[1:]
    items = []
    for line in lines:
        clean = line.strip(" •-–*·\t")
        if not clean:
            if items:
                break
            continue
        if re.match(r"^(improvement|blind|areas? of|plus|strength|career|aptitude|motivat|holland)", clean, re.I) and items:
            break
        if len(clean) > 3:
            items.append(clean)
        if len(items) >= 8:
            break
    return items


def parse_report(text):
    """Return (profile, report) where report lists which fields were found."""
    profile = empty_profile()
    report = {}

    profile["name"] = _find_name(text)
    profile["phone"] = _find_phone(text)
    profile["email"] = _find_email(text)

    apt = _find_aptitudes(text)
    profile["aptitudes"].update(apt)
    report["aptitudes"] = f"{len(apt)}/5"

    profile["motivators"] = _find_motivators(text)
    code, scores = _find_riasec(text)
    profile["riasec_code"] = code
    if scores:
        profile["riasec"].update({k: max(1, min(10, round(v))) for k, v in scores.items()})
        profile["riasec_scored"] = True
    elif code:
        profile["riasec"] = riasec_from_code(code)

    careers = _find_careers(text)
    profile["careers"] = (careers + ["", "", ""])[:3]
    profile["archetype"] = _find_archetype(text)
    profile["traits"] = _find_traits(text) or ARCHETYPES.get(profile["archetype"], [])
    profile["plus_points"] = _find_list(text, r"plus\s*points|key\s*strengths")
    profile["blind_spots"] = _find_list(text, r"improvement|blind\s*spots|areas?\s*(?:of|for)\s*(?:improvement|development)")

    report.update({
        "name": bool(profile["name"]),
        "contact": bool(profile["phone"] or profile["email"]),
        "motivators": len(profile["motivators"]),
        "riasec": code or "—",
        "careers": len(careers),
        "archetype": bool(profile["archetype"]),
        "plus_points": len(profile["plus_points"]),
        "blind_spots": len(profile["blind_spots"]),
    })
    return profile, report
