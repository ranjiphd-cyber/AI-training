"""Upload, mapping, schema validation and data-quality profiling.

Rules enforced here:
* Raw uploads are stored once, content-addressed and read-only.
* Duplicate uploads are detected by SHA-256 and not stored twice.
* Blanks stay missing (NaN) - they are never converted to zero.
* Rows that fail validation are flagged, never silently deleted.
"""
from __future__ import annotations

import hashlib
import os
import re
import shutil
from pathlib import Path

import numpy as np
import pandas as pd

from .project import add_record, load_state, log, now, require, save_state

PII_PATTERNS = re.compile(
    r"(^|_)(name|first_?name|last_?name|surname|email|e_?mail|phone|mobile|dob|birth|address|"
    r"postcode|zip|ssn|national_?id|passport|personnummer|aadhaar|pan|patient_?id|employee_?name)($|_)",
    re.I,
)


def sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_table(path, sheet=None) -> dict[str, pd.DataFrame]:
    """Return {sheet_name: DataFrame}. Blanks are NaN; nothing is filled."""
    path = Path(path)
    if path.suffix.lower() in (".csv", ".txt"):
        return {"csv": pd.read_csv(path, keep_default_na=True)}
    if path.suffix.lower() in (".xlsx", ".xlsm", ".xls"):
        return pd.read_excel(path, sheet_name=sheet if sheet else None)
    raise ValueError(f"Unsupported file type {path.suffix}")


def register_upload(pdir, file_path, user: str, description: str = "") -> dict:
    state = load_state(pdir)
    require(state, user, "upload")
    digest = sha256(file_path)
    for up in state["uploads"]:
        if up["sha256"] == digest:
            log(state, user, "duplicate_upload", f"{Path(file_path).name} == {up['upload_id']}")
            save_state(pdir, state)
            return {**up, "duplicate": True}
    sheets = read_table(file_path)
    upload_id = f"UP-{len(state['uploads']) + 1:03d}"
    dest = Path(pdir) / "raw" / f"{upload_id}_{digest[:12]}_{Path(file_path).name}"
    shutil.copy2(file_path, dest)
    os.chmod(dest, 0o444)  # immutable raw copy
    rec = {
        "upload_id": upload_id, "file": dest.name, "original_name": Path(file_path).name,
        "sha256": digest, "uploaded_by": user, "uploaded_at": now(), "description": description,
        "sheets": {k: {"rows": int(v.shape[0]), "columns": [str(c) for c in v.columns]} for k, v in sheets.items()},
        "duplicate": False,
    }
    state["uploads"].append(rec)
    log(state, user, "upload", f"{upload_id} {rec['original_name']}")
    save_state(pdir, state)
    return rec


def schema_check(columns, expected) -> dict:
    cols, exp = set(map(str, columns)), set(expected)
    missing, added = sorted(exp - cols), sorted(cols - exp)
    return {"compatible": not missing, "missing_columns": missing, "new_columns": added}


def apply_mapping(df: pd.DataFrame, mapping: dict, field_defs: list[dict]) -> tuple[pd.DataFrame, list[dict]]:
    """Map source columns to standard fields and coerce types.

    mapping: {standard_field: source_column}. Values that cannot be parsed
    become missing and are reported as issues; the row is retained.
    """
    defs = {f["field"]: f for f in field_defs}
    out, issues = pd.DataFrame(index=df.index), []
    for std, src in mapping.items():
        if src not in df.columns:
            issues.append({"field": std, "issue": "source column not found", "source": src, "count": None})
            continue
        if std not in defs:
            issues.append({"field": std, "issue": "not a defined standard field", "source": src, "count": None})
            continue
        col, ftype = df[src], defs[std]["type"]
        was_missing = col.isna()
        if ftype == "datetime":
            conv = pd.to_datetime(col, errors="coerce")
        elif ftype == "number":
            conv = pd.to_numeric(col, errors="coerce")
        elif ftype == "boolean":
            m = {"1": True, "0": False, "true": True, "false": False, "yes": True, "no": False, "y": True, "n": False}
            conv = col.map(lambda v: m.get(str(v).strip().lower(), np.nan) if pd.notna(v) else np.nan)
        else:
            conv = col.astype("string")
        bad = conv.isna() & ~was_missing
        if bad.any():
            issues.append({"field": std, "issue": f"unparseable as {ftype} -> set missing", "source": src, "count": int(bad.sum())})
        allowed = defs[std].get("allowed_values")
        if allowed is not None:
            invalid = conv.notna() & ~conv.isin(allowed)
            if invalid.any():
                issues.append({"field": std, "issue": f"value outside allowed list {allowed}", "source": src, "count": int(invalid.sum())})
        out[std] = conv
    for f in field_defs:
        if f.get("required") and f["field"] not in mapping:
            issues.append({"field": f["field"], "issue": "required field not mapped", "source": None, "count": None})
    return out, issues


def quality_profile(df: pd.DataFrame, id_col: str | None = None, chronology: list[tuple[str, str]] = ()) -> dict:
    """Data-quality profile. Reports - never repairs."""
    prof = {
        "rows": int(df.shape[0]), "columns": int(df.shape[1]),
        "missing": {c: {"n": int(df[c].isna().sum()), "pct": round(float(df[c].isna().mean() * 100), 1)} for c in df.columns},
        "exact_duplicate_rows": int(df.duplicated().sum()),
        "duplicate_ids": None, "chronology_violations": {}, "date_coverage": {},
        "pii_columns": [c for c in df.columns if PII_PATTERNS.search(str(c))],
        "types": {c: str(t) for c, t in df.dtypes.items()},
    }
    if id_col and id_col in df.columns:
        prof["duplicate_ids"] = int(df[id_col].dropna().duplicated().sum())
    for start, end in chronology:
        if start in df.columns and end in df.columns:
            both = df[start].notna() & df[end].notna()
            prof["chronology_violations"][f"{end} < {start}"] = int((df.loc[both, end] < df.loc[both, start]).sum())
    for c in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[c]) and df[c].notna().any():
            prof["date_coverage"][c] = [str(df[c].min().date()), str(df[c].max().date())]
    return prof


def deduplicate_ids(df: pd.DataFrame, id_col: str, keep: str = "last") -> tuple[pd.DataFrame, dict]:
    """Explicit, logged de-duplication (caller must record it as a transformation)."""
    dup = df[id_col].notna() & df.duplicated(subset=[id_col], keep=keep)
    return df.loc[~dup].copy(), {"transformation": "deduplicate_ids", "id_col": id_col, "keep": keep, "rows_removed": int(dup.sum())}


def data_request_from_gaps(state: dict, profile: dict, threshold_pct: float = 20.0, owner: str = "TBC") -> list[dict]:
    """Turn high-missingness fields into data-collection plan rows (no invented sample size)."""
    recs = []
    for col, m in profile["missing"].items():
        if m["pct"] >= threshold_pct:
            recs.append(add_record(
                state, "data_requests", actor="engine",
                question=f"Why is '{col}' missing for {m['pct']}% of records, and can it be captured?",
                required_field=col, operational_definition="TBC - agree with process owner",
                source="TBC", collection_method="TBC", sampling_rationale="Set from required precision - not a fixed rule",
                owner=owner, frequency="TBC", validation="Reconcile against system of record",
                completion_evidence="Missingness below agreed tolerance", status="Open"))
    return recs
