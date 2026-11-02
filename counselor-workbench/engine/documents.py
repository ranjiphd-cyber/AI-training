"""Read candidate documents (PDF, Word, Excel, text) and parse resumes."""

import csv
import io
import re

from .parser import OWNER_PHONE, extract_text

DOC_TYPES = ["pdf", "docx", "doc", "txt", "rtf"]
SHEET_TYPES = ["xlsx", "xlsm", "csv"]


def extract_any(name, data):
    """Return plain text from an uploaded file; raise ValueError with a readable reason."""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext == "pdf":
        text = extract_text(data)
        if not text.strip():
            raise ValueError(f"{name}: no text found — it may be a scanned image. Save it as a text-based PDF or Word file.")
        return text
    if ext == "docx":
        import docx
        doc = docx.Document(io.BytesIO(data))
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                cells = []
                for c in row.cells:
                    t = c.text.strip()
                    if t and t not in cells:  # merged cells repeat their text
                        cells.append(t)
                if cells:
                    parts.append(" | ".join(cells))
        return "\n".join(parts)
    if ext == "doc":
        raise ValueError(f"{name}: the old Word .doc format can't be read. In Word, use File → Save As → Word Document (.docx) or PDF, then upload again.")
    if ext in ("xlsx", "xlsm"):
        from openpyxl import load_workbook
        wb = load_workbook(io.BytesIO(data), data_only=True, read_only=True)
        lines = []
        for ws in wb.worksheets:
            lines.append(f"[{ws.title}]")
            for row in ws.iter_rows(values_only=True):
                vals = [str(v) for v in row if v not in (None, "")]
                if vals:
                    lines.append(" | ".join(vals))
        return "\n".join(lines)
    if ext == "csv":
        rows = csv.reader(io.StringIO(_decode(data)))
        return "\n".join(" | ".join(r) for r in rows if any(r))
    if ext == "rtf":
        text = _decode(data)
        text = re.sub(r"\\'[0-9a-f]{2}", "", text)
        text = re.sub(r"\\[a-z]+-?\d* ?|[{}]", "", text)
        return text
    if ext == "txt":
        return _decode(data)
    raise ValueError(f"{name}: unsupported file type. Use PDF, Word (.docx), Excel (.xlsx) or text.")


def _decode(data):
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", "ignore")


SECTION_PATTERNS = [
    ("education", r"education|academic|qualification|schooling"),
    ("experience", r"experience|employment|work history|internship|professional"),
    ("projects", r"projects?|research|portfolio"),
    ("skills", r"skills?|technical|tools|competenc|languages known|software"),
    ("certifications", r"certific|courses?|training|workshops?"),
    ("achievements", r"achievement|award|honou?r|accomplishment|olympiad|competition"),
    ("activities", r"extra[- ]?curricular|activities|hobbies|interests|volunteer|leadership|clubs?|sports"),
    ("summary", r"summary|objective|profile|about me|career goal"),
]
SECTION_LABELS = {
    "summary": "Summary / objective", "education": "Education", "experience": "Experience & internships",
    "projects": "Projects", "skills": "Skills", "certifications": "Certifications & courses",
    "achievements": "Achievements", "activities": "Activities & interests",
}


def parse_resume(text):
    """Split a resume into labelled sections and pull out contact details."""
    sections = {k: [] for k in SECTION_LABELS}
    current = "summary"
    contact = {}
    lines = [l.strip(" •·-–*\t") for l in text.splitlines()]
    for line in lines:
        if not line:
            continue
        head = line.lower().rstrip(":").strip()
        matched = None
        if len(head) <= 40 and len(head.split()) <= 5:
            for key, pat in SECTION_PATTERNS:
                if re.fullmatch(rf"(?:[a-z &/]*\b)?(?:{pat})[a-z &/]*", head):
                    matched = key
                    break
        if matched:
            current = matched
            continue
        sections[current].append(line)

    m = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    if m:
        contact["email"] = m.group(0)
    for m in re.finditer(r"(\+?\d[\d \-]{8,14}\d)", text):
        digits = re.sub(r"\D", "", m.group(1))
        if len(digits) >= 10 and OWNER_PHONE not in digits and not re.fullmatch(r"(19|20)\d{2}(19|20)\d{2}", digits):
            contact["phone"] = m.group(1).strip()
            break
    first = next((l for l in lines if l), "")
    if first and len(first.split()) <= 4 and not re.search(r"[@\d]|resume|curriculum|vitae|cv", first, re.I):
        contact["name"] = first.title() if first.isupper() else first

    # Text before any heading is usually the header block (name/contact), not a summary.
    sections["summary"] = [l for l in sections["summary"] if l != first and "@" not in l and not re.search(r"\d{6,}", re.sub(r"\D", "", l) or "x")]
    return {"contact": contact, "sections": {k: v for k, v in sections.items() if v}}


def resume_summary_md(resume, max_lines=4):
    """Short markdown summary used in the app, the dossier and the AI payload."""
    out = []
    for key, label in SECTION_LABELS.items():
        lines = resume.get("sections", {}).get(key)
        if lines:
            shown = lines[:max_lines]
            more = f" (+{len(lines) - max_lines} more)" if len(lines) > max_lines else ""
            out.append(f"**{label}:** " + "; ".join(shown) + more)
    return "\n\n".join(out)
