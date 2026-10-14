#!/usr/bin/env python3
"""Build the vendor dataset (vendors.json) for the TA Vendor Dashboard from the
shortlisting workbook.

Usage:  python3 build_dataset.py <workbook.xlsx> <out.json>

The workbook is treated as reference material: values are kept as written,
conflicts between tabs are recorded rather than resolved, and every field
carries the tab/row it came from.  Output contains personal contact data, so
keep it out of public repositories (see README).
"""
import json, re, sys, datetime
from collections import OrderedDict
import openpyxl

WB_PATH, OUT_PATH = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(WB_PATH, data_only=True)
WB_MODIFIED = wb.properties.modified.isoformat() if wb.properties.modified else None

BASE = "Base Data"
SLV = "Short Listed Vendor"
SV = "Shortlisted Vendors"
EXE = "Executive search"
VOL = "Volume hiring"
REJ = "Rejected Vendors"

# ---------------------------------------------------------------- helpers
def clean(v):
    if v is None:
        return ""
    if isinstance(v, datetime.time):
        return v
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).replace("\xa0", " ").replace("<br>", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()

MD_LINK = re.compile(r"\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)")
def strip_md(s):
    """'[a@b.com](mailto\\:a@b.com)' -> 'a@b.com' ; keeps visible text only."""
    s = MD_LINK.sub(lambda m: m.group(1), s)
    s = s.replace("\\<", "<").replace("\\:", ":").replace("www\\.", "www.").replace("\\", "")
    return re.sub(r"\s+", " ", s).strip(" :")

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
def emails_in(s):
    return [e.rstrip(".") for e in EMAIL.findall(s or "")]

MISSING_TOKENS = {"", "-", "--", "na", "n/a", "nil", "none", "pending", "tbd", "."}
def is_missing(s):
    return isinstance(s, str) and s.strip().lower().strip(" .") in MISSING_TOKENS

def norm_cmp(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())

SUFFIX = re.compile(r"\b(private|pvt|ltd|limited|llp|inc|plc|company|co|the|group)\b")
def norm_name(s):
    s = strip_md(clean(s)).lower().replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = SUFFIX.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", norm_name(s)).strip("-")[:48] or "vendor"

# ------------------------------------------------- canonical identity map
# Explicit merges.  Key: normalised name as it appears in a tab; value:
# canonical id.  Only names that clearly denote the same organisation (same
# registered name modulo spelling/suffix, or same SPOC + email domain) are
# merged; look-alike names that may be separate entities are NOT listed and
# get a "possibly related" note instead.
ALIASES = {
    "ciel hr services": "ciel-hr",
    "cemetrix it services": "cemetrix",
    "questw talent solutons": "questw", "questw talent solutions": "questw",
    "quest w talent solutions": "questw",
    "exo talent": "exotalent", "exotalent consultancy services": "exotalent",
    "mountblue": "montbleu", "montbleu technologies": "montbleu",
    "rgf select india": "rgf-select", "rgf": "rgf-select",
    "manpowergroup services india": "manpowergroup", "manpower": "manpowergroup",
    "team lease": "teamlease", "teamlease services": "teamlease", "teamlease services pvt": "teamlease",
    "covenant": "covenant", "covenant consultants": "covenant",
    "pegasus info corp": "pegasus", "pegasus infocorp": "pegasus",
    "xpt consultancy and software services": "xpt", "xpt connect": "xpt",
    "precision technologies corp": "precisiontech", "precisiontech global it solutions": "precisiontech",
    "tribelean": "tribelean", "tribelean cloud and data solutions": "tribelean",
    "cx search": "cxsearch", "cxsearch global partners": "cxsearch",
    "net expat india": "netexpat", "netexpat": "netexpat",
    "xebia it architects": "xebia",
    "odgers berndtson india": "odgers", "odgers berndtson": "odgers",
    "leaders edge": "leaders-edge",
    "corner stone": "cornerstone", "cornerstone": "cornerstone",
    "sapphire human capital": "sapphire",
    "abc": "abc-consultants",
    "michael page international recruitment": "michael-page",
    "ema partners executive search": "ema-partners", "ema partners": "ema-partners",
    "mijas consultants": "antal-mijas",
    "adrenalin esystems": "adrenalin",
    "suitable": "suitable", "bodhitva": "bodhitva", "hyre sure": "bodhitva",
    "cielo talent": "cielo", "gi staffing services": "gi-group",
    "rembarrier advisors": "rembarrier",
    "korn fery": "korn-ferry",
    "htc global services india": "htc-global",
    "persol india": "persol",
    "crewkarma networks": "crewkarma",
    "mountrootz consulting": "mountrootz",
    "spanidea systems": "spanidea", "spanidea systems pvt": "spanidea",
    "globalhunt india": "globalhunt",
    "wenger and watson": "wenger-watson",
    "joulestowatts business solutions": "joulestowatts",
    "creative synergies consulting india": "creative-synergies",
    "orcapod": "orcapod",
    "pioneer business solutions": "pioneer",
    "consortium gifts": "consortium-gifts", "consortium gifts ktd": "consortium-gifts",
}

# Display names for merged records where the workbook spelling is a fragment
# or misspelling.  Every workbook spelling is kept as an alias.
DISPLAY = {
    "abc-consultants": "ABC Consultants", "korn-ferry": "Korn Ferry", "cornerstone": "Cornerstone",
    "leaders-edge": "Leaders' Edge", "odgers": "Odgers Berndtson India Pvt Ltd",
    "pegasus": "Pegasus InfoCorp Pvt. Ltd", "cielo": "Cielo Talent", "exotalent": "Exotalent Consultancy Services",
    "montbleu": "Montbleu Technologies", "questw": "QuestW Talent Solutions", "ciel-hr": "CIEL HR Services Limited",
    "covenant": "Covenant Consultants", "consortium-gifts": "Consortium Gifts Pvt Ltd",
}

# Section-2 rows of Base Data whose "company" cell holds a job title or
# department.  Organisation inferred from the e-mail domain (Needs verification).
INFERRED = {
    130: ("abc-consultants", "ABC Consultants", "Technology captives & GIC's"),
    170: ("cielo", "Cielo Talent", "Country Head – India & Philippines"),
    173: ("rembarrier", "Rembarrier Advisors Pvt. Ltd", "Talent Acquisition Solutions across Mid"),
    175: ("gi-group", "GI Staffing Services", "AVP – Sales"),
    178: ("creative-synergies", "Creative Synergies Consulting India Pvt Ltd", "Contingent Workforce Business."),
    184: ("persol", "PERSOL India Private Limited", "Customer Success – India Growth Team"),
    185: ("bodhitva", "Bodhitva", "Customer success & Empowerment"),
    187: ("suitable", "Suitable", "Business Development Manager"),
    188: ("joulestowatts", "Joulestowatts Business Solutions Pvt Ltd", "Lead Generation Executive"),
    192: (None, "Temploymentz / V4U HR Solutions", "Operations Head and Co founder-Temploymentz"),
    199: (None, "PSIT (Corporate Relations)", "Corporate Relations"),
    200: (None, "upGrad", "Seige Creado"),
    203: (None, "Career Development & Placement Office (institution not named)", "Career Development & Placement Office"),
    217: (None, "House of Cheer", "Vedika Arora"),
    224: ("xebia", "Xebia IT Architects Private Limited", "GCC Strategy & Growth"),
    231: (None, "HackerEarth", "Enterprise SDR – Programs"),
    232: (None, "Maki People", "Talent Strategy Advisor"),
    294: (None, "Programming.com", "Strategic Alliance Manager"),
}

# Vendor type for the contact list (Base Data section 2).  Dashboard
# classification from name/domain only -> always "Needs verification".
TYPE_RULES = [
    ("Campus / education", r"universit|institut|college|academy|\bnsb\b|jagsom|tapmi|great lakes|sies|career guidance|placement office|new horizon|cranes varsity|kalvium|guvi|42 learn|atlas skilltech|psit|emertxe|naukri campus|super set|grad partners|global academy"),
    ("HR tech / platform", r"zing hr|phenom|zwayam|ukg|hackerearth|foundit|monster|qapita|benepik|trophykart|happyness|mera monitor|vonboard|zeko|qallify|suitable|bodhitva|hyre sure|myllynk|athmick|maki|spring works|growby|get work|mylynk|violetinfo|upgrad|house of cheer|go fluent|ets\b|aon\b"),
    ("Background verification", r"id fy|idfy|on grid|gridlines|instaveritas|ikn chase|krya screening|tracert|antlegs"),
    ("Relocation / other HR service", r"netexpat|net expat|lhh|sourcepro training|trump trainers|consortium gifts"),
]
def guess_type(name):
    n = name.lower()
    for t, rx in TYPE_RULES:
        if re.search(rx, n):
            return t
    return "Recruitment / staffing"

# ------------------------------------------------------------ record model
vendors = OrderedDict()
issues = []          # workbook-level notes

def new_vendor(vid, name):
    return {
        "id": vid, "name": name, "aliases": [], "origin": "source",
        "vendorType": {"v": "Recruitment / staffing", "q": "verify", "src": [], "note": "Dashboard classification"},
        "fields": {}, "contacts": [], "clientRefs": [], "sources": [],
        "status": {"stage1": "Not assessed", "reason": "", "src": None},
        "modules": {}, "levelTags": [], "lists": [], "shortlist": None,
        "flags": [], "categories": {}, "fee": {"v": "", "q": "missing", "note": "No placement-fee data in the supplied workbook."},
    }

def get_vendor(name, src_label, forced_id=None, display=None):
    key = norm_name(name)
    vid = forced_id or ALIASES.get(key) or slug(name)
    if vid not in vendors:
        vendors[vid] = new_vendor(vid, display or strip_md(clean(name)))
    v = vendors[vid]
    disp = strip_md(clean(name))
    if disp and norm_cmp(disp) != norm_cmp(v["name"]) and disp not in v["aliases"]:
        v["aliases"].append(disp)
    if src_label not in v["sources"]:
        v["sources"].append(src_label)
    return v

def flag(v, kind, text, field=None):
    item = {"kind": kind, "text": text}
    if field: item["field"] = field
    if item not in v["flags"]:
        v["flags"].append(item)

def ratio_fix(val):
    """Excel turned '5:7' style ratios into times; decimals are fractions."""
    if isinstance(val, datetime.time):
        return f"{val.hour}:{val.minute}", "verify", f"Stored by Excel as time {val.strftime('%H:%M:%S')}; read as ratio {val.hour}:{val.minute}."
    s = clean(val)
    try:
        f = float(s)
        if 0 < f <= 1:
            return f"{round(f*100,2):g}%", "verify", f"Stored as decimal {s}; shown as percentage."
    except ValueError:
        pass
    return s, None, None

def set_field(v, key, raw, src, transform=None):
    if raw is None:
        return
    note, q = None, None
    if transform:
        val, q, note = transform(raw)
    else:
        val = clean(raw)
        if isinstance(val, datetime.time):
            val = val.strftime("%H:%M")
    val = strip_md(val) if isinstance(val, str) else val
    if val == "":
        return
    if is_missing(val):
        f = v["fields"].get(key)
        if not f:
            v["fields"][key] = {"v": "", "q": "missing", "src": [src], "note": f"Source says “{val}”."}
        return
    low = val.lower()
    if low.startswith("same as column"):
        if not v["fields"].get(key):
            v["fields"][key] = {"v": "", "q": "missing", "src": [src], "note": f"Source says “{val}” (refers to another column)."}
        return
    if low.startswith("confidential") or low.startswith("confidencial"):
        q, note = "verify", "Vendor marked this as confidential."
    f = v["fields"].get(key)
    if not f or f["q"] == "missing":
        v["fields"][key] = {"v": val, "q": q or "provided", "src": [src]}
        if note: v["fields"][key]["note"] = note
        return
    if norm_cmp(f["v"]) == norm_cmp(val):
        if src not in f["src"]: f["src"].append(src)
        return
    alts = f.setdefault("alt", [])
    if not any(norm_cmp(a["v"]) == norm_cmp(val) for a in alts):
        alts.append({"v": val, "src": src})
        f["q"] = "conflict"

# ------------------------------------------------------- Base Data section 1
FIELD_COLS = [  # Base Data header -> field key
    ("spocName", "B"), ("spocDesignation", "C"), ("spocPhone", "D"), ("spocEmail", "E"),
    ("years", "F"), ("hq", "G"), ("recruiters", "H"), ("gstPan", "I"), ("entityType", "J"),
    ("revenue", "K"), ("domain", "L"), ("specialization", "M"), ("headcount", "N"),
    ("industries", "O"), ("profilesPerReq", "P"), ("closureTimeline", "Q"), ("activeClients", "R"),
    ("majorClients", "S"), ("wfo", "T"), ("nicheUrgent", "U"), ("dedicatedRecruiters", "V"),
    ("positionsClosed12m", "W"), ("joiningRatio", "X"), ("trackingReports", "Y"),
    ("diversity", "Z"), ("comments", "AA"), ("score", "AB"), ("finalDecision", "AC"),
]
ws = wb["Base Data "]
seen_rows = {}
for r in range(2, 89):
    name = ws[f"A{r}"].value
    if not clean(name):
        continue
    src = f"{BASE} r{r}"
    v = get_vendor(name, src)
    k = norm_name(name)
    if k in seen_rows:
        flag(v, "duplicate", f"Duplicate row in Base Data (rows {seen_rows[k]} and {r}); values compared field by field.")
    seen_rows.setdefault(k, r)
    for key, col in FIELD_COLS:
        set_field(v, key, ws[f"{col}{r}"].value, src, ratio_fix if key == "joiningRatio" else None)

# ------------------------------------------------------- Base Data section 2
# Contact list: columns shifted one to the right of the header row
# (C = SPOC, D = designation, E = phone, F = e-mail ...), B = hiring level tag,
# AE = unlabeled "Yes".
SHIFT = {k: openpyxl.utils.get_column_letter(openpyxl.utils.column_index_from_string(c) + 1)
         for k, c in FIELD_COLS if c not in ("B",)}
SHIFT["spocName"] = "C"
issues.append({"tab": BASE, "text": "Rows 89–318 are a second contact list whose columns sit one place to the right of the header (SPOC in column C, e-mail in column F). The dashboard reads them with that offset."})
issues.append({"tab": BASE, "text": "Column AE has no header and holds “Yes” for 195 contact-list rows. Its meaning is unknown, so it is shown as “Unlabeled flag (col AE)” on those records."})
for r in range(89, 320):
    raw_name = ws[f"A{r}"].value
    if not clean(raw_name):
        continue
    src = f"{BASE} r{r}"
    if r in INFERRED:
        vid, disp, cell = INFERRED[r]
        v = get_vendor(disp, src, forced_id=vid or slug(disp), display=disp)
        if cell in v["aliases"]: v["aliases"].remove(cell)
        flag(v, "verify", f"Base Data r{r}: company cell reads “{cell}” (a job title/department). Organisation inferred from the contact’s e-mail domain.", "name")
    else:
        v = get_vendor(raw_name, src)
    tag = clean(ws[f"B{r}"].value)
    if tag:
        t = {"Leadeship": "Leadership", "Senior Leadeship": "Senior Leadership"}.get(tag, tag)
        if t not in [x["v"] for x in v["levelTags"]]:
            v["levelTags"].append({"v": t, "src": src})
    spoc = strip_md(clean(ws[f"C{r}"].value)) if ws[f"C{r}"].value else ""
    email_cell = strip_md(clean(ws[f"F{r}"].value)) if ws[f"F{r}"].value else ""
    if spoc or email_cell:
        em = emails_in(email_cell)
        contact = {"name": spoc.lstrip(": ").strip(), "designation": clean(ws[f"D{r}"].value) if ws[f"G{r}"].value else "",
                   "phone": "", "email": ", ".join(em), "raw": email_cell if not em or len(email_cell) > len(", ".join(em)) + 3 else "", "src": src}
        if ws[f"G{r}"].value:   # full questionnaire row (shifted)
            contact["phone"] = clean(ws[f"E{r}"].value)
        if not em and re.search(r"\+?\d[\d\s-]{7,}", email_cell):
            contact["phone"], contact["raw"] = email_cell.replace("M:", "").strip(), ""
        if r == 231:
            contact["name"], contact["note"] = "", "Contact name not given; column C holds the company name “HackerEarth”."
        dup = next((c for c in v["contacts"] if norm_cmp(c["name"]) == norm_cmp(contact["name"]) and c["email"] == contact["email"]), None)
        if dup:
            dup["src"] += f"; {src}"
        else:
            v["contacts"].append(contact)
        # mailto target differs from visible address
        raw_f = clean(ws[f"F{r}"].value)
        hidden = [e for e in emails_in(re.sub(r"^\[[^\]]*\]", "", raw_f)) if e.lower() not in [x.lower() for x in em]]
        hidden = [h for h in hidden if "safelinks" not in h and "nylas" not in h]
        if hidden:
            flag(v, "conflict", f"Base Data r{r}: visible e-mail {', '.join(em) or email_cell} links to a different address ({', '.join(sorted(set(hidden)))}).", "email")
    if ws[f"AE{r}"].value:
        v.setdefault("unlabeledAE", []).append(src)
    if ws[f"G{r}"].value and r not in (222,):
        for key, col in FIELD_COLS:
            if key in ("spocName",):
                continue
            set_field(v, key, ws[f"{SHIFT[key]}{r}"].value, src, ratio_fix if key == "joiningRatio" else None)
    if r == 222:
        set_field(v, "domain", ws[f"G{r}"].value, src)

# ---------------------------------------------- Short Listed Vendor (Stage 1)
ws = wb[SLV]
issues.append({"tab": SLV, "text": "Column B has no header. It holds “Yes”, “Mid Level” or “Leadeship” for a few vendors; shown as a level tag."})
for r in range(2, ws.max_row + 1):
    name = ws[f"A{r}"].value
    if not clean(name):
        continue
    src = f"{SLV} r{r}"
    v = get_vendor(name, src)
    tag = clean(ws[f"B{r}"].value)
    if tag:
        t = {"Leadeship": "Leadership"}.get(tag, tag)
        v["levelTags"].append({"v": "Flag ‘Yes’ (unlabeled col B)" if t == "Yes" else t, "src": src})
    st = clean(ws[f"C{r}"].value).upper()
    if st:
        if v["status"]["stage1"] not in ("Not assessed", st):
            flag(v, "conflict", f"Status {st} in {SLV} conflicts with {v['status']['stage1']} ({v['status']['src']}).", "status")
        v["status"] = {"stage1": st, "reason": clean(ws[f"D{r}"].value), "src": src}
        if st == "PASS" and "additional information" in v["status"]["reason"].lower():
            flag(v, "verify", "Recorded as PASS while the comment says additional information is still required.", "status")
        if not v["status"]["reason"]:
            flag(v, "missing", f"{st} recorded without a reason.", "status")
    elif r >= 59:
        flag(v, "verify", f"{SLV} r{r} lists this vendor again with no status (tag only).", "status")
    set_field(v, "domain", ws[f"E{r}"].value, src)
    set_field(v, "specialization", ws[f"F{r}"].value, src)
    g = clean(ws[f"G{r}"].value)
    if g and g.lower() not in ("same as column r", "atttached ppt"):
        set_field(v, "majorClients", g, src)
    elif g:
        flag(v, "missing", f"Major clients given as “{g}” in {SLV} r{r}; the referenced material is not in the workbook.", "majorClients")
    for mod, col in (("A", "H"), ("B", "I"), ("C", "J")):
        mv = clean(ws[f"{col}{r}"].value).lower()
        if mv:
            v["modules"][mod] = {"v": "yes" if mv == "yes" else "no" if mv == "no" else "pending", "src": src}
    ref = [clean(ws[f"{c}{r}"].value) for c in "KLMN"]
    if any(ref):
        pending = lambda x: is_missing(x) or x.lower().startswith("pending")
        pend = all(pending(x) for x in ref if x)
        partial = not pend and any(pending(x) for x in ref)
        contact = re.sub(r"^\*", "", ref[3]).replace("*", "").strip(" |")
        v["clientRefs"].append({"company": ref[0], "person": ref[1], "designation": ref[2], "contact": contact,
                                "q": "missing" if pend else "verify" if partial else "provided", "src": src})
        if partial:
            flag(v, "verify", f"Client reference in {SLV} r{r} is incomplete (some fields marked Pending).", "clientRef")

# ----------------------------------------------------------- Rejected Vendors
ws = wb[REJ]
for r in range(2, ws.max_row + 1):
    name = ws[f"A{r}"].value
    if not clean(name):
        continue
    src = f"{REJ} r{r}"
    v = get_vendor(name, src)
    st = clean(ws[f"B{r}"].value).upper()
    if v["status"]["stage1"] not in ("Not assessed", st):
        flag(v, "conflict", f"FAIL in {REJ} conflicts with {v['status']['stage1']} ({v['status']['src']}).", "status")
    v["status"] = {"stage1": st, "reason": clean(ws[f"C{r}"].value), "src": src}

# --------------------------------------------- Executive search / Volume tabs
for tab, lab in ((EXE, "Executive search tab"), (VOL, "Volume hiring tab")):
    ws = wb[tab]
    for r in range(2, ws.max_row + 1):
        name = ws[f"B{r}"].value
        if not clean(name):
            continue
        v = get_vendor(name, f"{tab} r{r}")
        v["lists"].append({"v": lab, "src": f"{tab} r{r}"})
    if tab == VOL:
        for r in range(2, ws.max_row + 1):
            g = ws[f"G{r}"].value
            if clean(g):
                v = get_vendor(g, f"{tab} r{r} (col G)")
                v["lists"].append({"v": "Volume tab col G (not in Executive search list)", "src": f"{tab} r{r} G"})
issues.append({"tab": EXE, "text": "Header cell C1 reads “6” but the tab lists 25 vendors. The 25 are exactly the Stage 1 PASS vendors with Module A (Executive/CXO) = yes."})
issues.append({"tab": VOL, "text": "Header cell C1 reads “25” and D1 reads “leadership”, but the tab lists 31 vendors. The 31 match the PASS vendors with Module B (Senior Leadership) = yes, not a volume-hiring criterion. Column G lists the 6 of them that are not in the Executive search tab. Treat “Volume hiring” membership as ambiguous."})

# --------------------------------------------- Shortlisted Vendors (CXO tab)
ws = wb[SV]
HEAD = ["spocName", "spocDesignation", "spocPhone", "spocEmail", "years", "hq", "recruiters", "gstPan",
        "entityType", "revenue", "domain", "specialization", "headcount", "industries", "profilesPerReq",
        "closureTimeline", "activeClients", "majorClients", "wfo", "nicheUrgent", "dedicatedRecruiters",
        "positionsClosed12m", "joiningRatio", "trackingReports", "diversity", "comments", "score", "finalDecision"]
for r in range(3, ws.max_row + 1):
    name = clean(ws[f"B{r}"].value)
    if not name or name in ("Vendor", "Leadership Hiring"):
        continue
    tier = "CXO / Senior Leadership" if r < 10 else "Leadership Hiring"
    src = f"{SV} r{r}"
    v = get_vendor(name, src)
    v["shortlist"] = {"tier": tier, "fit": clean(ws[f"C{r}"].value), "why": clean(ws[f"D{r}"].value), "src": src}
    # Detail columns: aligned (EMA), shifted +1 (Sapphire) or shifted -2 (CIEL, W&W, MP, RGF)
    if tier == "CXO / Senior Leadership":
        set_field(v, "companyEmail", ws[f"E{r}"].value, src)
        set_field(v, "companyPhone", ws[f"F{r}"].value, src)
        if name == "CORNERSTONE":
            flag(v, "conflict", f"{SV} r{r}: detail columns G–AD repeat Sapphire Human Capital’s data (sumanta.b@sapphirehc.in, founded 2008, Mumbai…). Not applied to Cornerstone.")
            continue
        shifted = "@" in clean(ws[f"G{r}"].value)
        if shifted:   # row starts at the SPOC e-mail under the 'Spoc Name' header
            flag(v, "verify", f"{SV} r{r}: detail columns are shifted three places left of their headers (SPOC e-mail under ‘Spoc Name’); read with that offset.")
        start = 7   # column G
        keys = HEAD[3:] if shifted else HEAD
    else:
        start, keys = 5, HEAD[3:]  # column E holds the e-mail
        flag(v, "verify", f"{SV} r{r}: detail columns are shifted two places left of their headers (e-mail under ‘Email ID’ col E); read with that offset.")
    for i, key in enumerate(keys):
        col = openpyxl.utils.get_column_letter(start + i)
        set_field(v, key, ws[f"{col}{r}"].value, src, ratio_fix if key == "joiningRatio" else None)

# --------------------------------------------------------- notes & clean-up
REL_NOTES = {
    "innova-solutions": "Same SPOC (Ameet Kadwadkar) and e-mail domain as ACS Global Tech Solutions, which is recorded as PASS while Innova is on HOLD. Not merged; confirm whether these are the same group.",
    "acs-global-tech-solutions": "SPOC e-mail is on the innovasolutions domain (same SPOC as Innova Solutions, HOLD). Not merged; confirm relationship.",
    "rgf-exectuive-search-india": "Possibly related to RGF Select India (Recruit Group). Kept separate because the names denote different business units.",
    "rgf-select": "The CXO shortlist tab entry “RGF” uses this vendor’s e-mail (rgf-professional.com), so it is linked here. RGF Executive Search India is kept as a separate record.",
    "j2p-executive-headhunters": "SPOC e-mail is on the antal.com domain. Relationship to the Antal network is not stated; kept separate from other Antal entities.",
    "antal-mijas": "Antal International franchise (Mijas Consultants, Jaipur). Other Antal entities in the list (Antal International Network, Antal International (Steersman), J2P) are kept as separate records.",
    "antal-international-network": "Antal network entity; kept separate from Mijas Consultants (Antal) and Antal (Steersman).",
    "antal-international": "Antal network entity; kept separate from Mijas Consultants (Antal) and Antal International Network.",
    "randstad-source-right": "Randstad business unit; kept separate from Randstad Digital.",
    "randstad-digital": "Randstad business unit; kept separate from Randstad Sourceright.",
    "blisz": "Contact name (Kaushik Joshi) matches the Think People Solutions SPOC, but the e-mail is on a different domain. Not merged.",
    "bodhitva": "The same contact appears under “Hyre Sure”, “Bodhitva” and a row titled “Customer success & Empowerment”. Merged on the shared e-mail; confirm the brand name.",
    "precisiontech": "Contact-list row “Precision Technologies Corp.” uses the same SPOC and e-mail as PRECISIONTECH GLOBAL IT SOLUTIONS LLP (FAIL). Merged; registered name differs.",
    "tribelean": "Contact-list row “Tribelean Pvt Ltd” shares the e-mail domain with Tribelean Cloud and Data Solutions (FAIL). Merged; names differ.",
    "rembarrier": "Ashutosh Tiwary appears here (ashutosh@rembarrier.com) and as Acro HR’s SPOC (ashutosh.tiwary@acrocorp.com). Confirm which organisation he represents.",
    "acro-hr-solutions-india": "SPOC Ashutosh Tiwary also appears as a Rembarrier Advisors contact. Confirm current affiliation.",
    "exotalent": "Base Data r39 (“Exo Talent”) names SPOC Deepanker Raj Malik but uses rajat@exotalent.in, which belongs to Rajat Sharma in r63.",
    "montbleu": "Spelled “Mountblue” in Base Data r35 and “MONTBLEU TECHNOLOGIES PRIVATE” in r110; merged on the matching e-mail domain.",
}
for vid, note in REL_NOTES.items():
    if vid in vendors:
        flag(vendors[vid], "related", note)
    else:
        print("WARN note target missing:", vid, file=sys.stderr)

if "precisiontech" in vendors:
    f = vendors["precisiontech"]["fields"].get("years")
    if f and "PRECISION" in f["v"].upper():
        f["q"], f["note"] = "verify", "Years cell repeats the company name; years in operation not given."
for v in vendors.values():
    f = v["fields"].get("score")
    if f and f["v"] == "0":
        f["q"], f["note"] = "verify", "Score recorded as 0, outside the 1–5 scale, on a row with no questionnaire answers. Probably not scored."
if "xebia" in vendors:
    flag(vendors["xebia"], "provided", "Final Decision column (Base Data r53): vendor supports contractual staffing, not permanent recruitment.")

# type, categories, quality summary
KW_PERM = re.compile(r"permanent|perm\b|executive search|exec(e|u)?cuite|headhunt|search firm|leadership (hiring|search)|recruitment|placement|lateral hiring|cxo|board|rpo", re.I)
KW_AUG = re.compile(r"contract|staff aug|staff augu|staffing|c2h|managed services|temp\b|payroll|sow\b|contingent|bench", re.I)
KW_VOL = re.compile(r"bulk|volume|blue.?collar|mass|campus|generic hiring", re.I)

def text_of(v, *keys):
    return " ".join(v["fields"].get(k, {}).get("v", "") for k in keys)

for vid, disp in DISPLAY.items():
    if vid in vendors and vendors[vid]["name"] != disp:
        v = vendors[vid]
        if v["name"] not in v["aliases"]: v["aliases"].insert(0, v["name"])
        v["name"] = disp
        if disp in v["aliases"]: v["aliases"].remove(disp)
if "korn-ferry" in vendors:
    flag(vendors["korn-ferry"], "verify", "Spelled “Korn Fery” in the Shortlisted Vendors tab; shown as Korn Ferry.", "name")

for v in vendors.values():
    v["vendorType"]["v"] = guess_type(v["name"] + " " + " ".join(v["aliases"]))
    if v["status"]["stage1"] != "Not assessed" or v["shortlist"]:
        if v["vendorType"]["v"] == "Recruitment / staffing":
            v["vendorType"]["q"] = "provided"
            v["vendorType"]["note"] = "Assessed as a recruitment vendor in the workbook."
    if v["id"] in ("netexpat", "consortium-gifts"):
        v["vendorType"]["v"] = "Relocation / other HR service"
    cats = {}
    def add(cat, basis, ref):
        cats.setdefault(cat, []).append({"basis": basis, "ref": ref})
    m = v["modules"]
    if m.get("A", {}).get("v") == "yes": add("executive", "workbook", f"Module A = yes ({m['A']['src']})")
    if m.get("B", {}).get("v") == "yes": add("leadership", "workbook", f"Module B = yes ({m['B']['src']})")
    if m.get("C", {}).get("v") == "yes": add("juniorMid", "workbook", f"Module C = yes ({m['C']['src']})")
    if v["shortlist"]:
        add("executive" if v["shortlist"]["tier"].startswith("CXO") else "leadership", "workbook", f"{v['shortlist']['tier']} shortlist ({v['shortlist']['src']})")
    for t in v["levelTags"]:
        tv = t["v"].lower()
        if "senior leadership" in tv: add("executive", "workbook", f"Level tag “{t['v']}” ({t['src']})")
        elif "leadership" in tv or "senior level" in tv: add("leadership", "workbook", f"Level tag “{t['v']}” ({t['src']})")
        elif "mid" in tv: add("juniorMid", "workbook", f"Level tag “{t['v']}” ({t['src']})")
        elif "mass" in tv or "blue collar" in tv: add("volume", "workbook", f"Level tag “{t['v']}” ({t['src']})")
        elif "veteran" in tv: add("juniorMid", "derived", f"Level tag “{t['v']}” ({t['src']}) – veteran hiring")
    for l in v["lists"]:
        if l["v"] == "Volume hiring tab": add("volume", "ambiguous", f"Listed in Volume hiring tab ({l['src']}); tab matches Module B, see Data quality")
    svc = text_of(v, "specialization", "domain", "comments", "finalDecision", "entityType") + " " + (v["shortlist"] or {}).get("why", "")
    mp, ma, mv = KW_PERM.search(svc), KW_AUG.search(svc), KW_VOL.search(svc + " " + text_of(v, "nicheUrgent"))
    if mp and v["id"] != "xebia": add("permanent", "derived", f"Keyword “{mp.group(0)}” in specialization/domain/comments")
    if ma: add("staffAug", "derived", f"Keyword “{ma.group(0)}” in specialization/domain/comments")
    if mv: add("volume", "derived", f"Keyword “{mv.group(0)}” in specialization/domain/comments")
    if v["status"]["src"] and not mp and not ma and v["vendorType"]["v"] == "Recruitment / staffing" and v["id"] != "xebia":
        add("permanent", "derived", "Assessed recruitment vendor with no service model stated; permanent hiring assumed – verify")
    v["categories"] = cats
    # SPOC from contacts when Base Data section 1 had none
    if not v["fields"].get("spocName") and v["contacts"]:
        c = v["contacts"][0]
        for key, val in (("spocName", c["name"]), ("spocEmail", c["email"]), ("spocPhone", c["phone"]), ("spocDesignation", c["designation"])):
            if val: v["fields"][key] = {"v": val, "q": "provided", "src": [c["src"]]}
    for key in ("spocName", "spocPhone", "spocEmail", "hq"):
        if not v["fields"].get(key):
            v["fields"][key] = {"v": "", "q": "missing", "src": []}
    v["lastUpdated"] = WB_MODIFIED

out = {
    "meta": {
        "builtAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "workbookModified": WB_MODIFIED,
        "workbookTabs": [ws.title.strip() for ws in wb.worksheets],
        "powerpointReceived": False,
        "notes": issues,
    },
    "vendors": list(vendors.values()),
}
with open(OUT_PATH, "w") as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
print(f"{len(vendors)} vendors written to {OUT_PATH}")
