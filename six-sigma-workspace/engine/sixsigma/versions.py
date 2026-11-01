"""Versioned result bundles, refresh comparison, promotion and rollback.

A result bundle (versions/vNNN/results.json) is the single source of truth for
both the dashboard and the presentation, so their figures always reconcile.
New bundles are Draft until a named approver promotes them.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from .project import load_state, log, now, require, save_state


def _bundle_hash(bundle: dict) -> str:
    core = {k: v for k, v in bundle.items() if k not in ("created_at", "status", "content_hash")}
    return hashlib.sha256(json.dumps(core, sort_keys=True, default=str).encode()).hexdigest()[:16]


def create_version(pdir, bundle: dict, user: str, note: str = "") -> str:
    state = load_state(pdir)
    require(state, user, "analyze")
    vid = f"v{len(state['versions']) + 1:03d}"
    bundle = {**bundle, "project_id": state["config"]["project_id"], "version": vid, "created_at": now(),
              "status": "Draft - pending review", "note": note}
    bundle["content_hash"] = _bundle_hash(bundle)
    vdir = Path(pdir) / "versions" / vid
    vdir.mkdir(parents=True)
    (vdir / "results.json").write_text(json.dumps(bundle, indent=2, default=str), encoding="utf-8")
    state["versions"].append({"version": vid, "created_at": bundle["created_at"], "status": bundle["status"],
                              "content_hash": bundle["content_hash"], "note": note})
    log(state, user, "create_version", vid)
    save_state(pdir, state)
    return vid


def load_version(pdir, vid: str) -> dict:
    return json.loads((Path(pdir) / "versions" / vid / "results.json").read_text(encoding="utf-8"))


def compare_versions(old: dict, new: dict, material_rel_change: float = 0.05) -> dict:
    """KPI-by-KPI comparison. Material change => linked findings/approvals need review."""
    o = {k["kpi_id"]: k for k in old.get("kpis", [])}
    n = {k["kpi_id"]: k for k in new.get("kpis", [])}
    rows, material = [], []
    for kid in sorted(set(o) | set(n)):
        a, b = o.get(kid), n.get(kid)
        if a is None or b is None:
            rows.append({"kpi_id": kid, "change": "added" if a is None else "removed", "material": True})
            material.append(kid)
            continue
        va, vb = a.get("current"), b.get("current")
        if isinstance(va, (int, float)) and isinstance(vb, (int, float)):
            rel = abs(vb - va) / abs(va) if va else (0.0 if vb == va else 1.0)
            is_mat = rel >= material_rel_change
            rows.append({"kpi_id": kid, "old": va, "new": vb, "abs_change": round(vb - va, 2),
                         "rel_change_pct": round(rel * 100, 1), "old_n": a.get("n"), "new_n": b.get("n"), "material": bool(is_mat)})
        else:
            is_mat = va != vb
            rows.append({"kpi_id": kid, "old": va, "new": vb, "material": is_mat})
        if (a.get("definition") != b.get("definition")) or (a.get("unit") != b.get("unit")):
            rows[-1]["definition_changed"] = True
            is_mat = True
        if is_mat:
            material.append(kid)
    affected_findings = [f["id"] for f in new.get("findings", []) if set(f.get("kpi_ids", [])) & set(material)]
    return {"from": old.get("version"), "to": new.get("version"), "kpis": rows, "material_kpis": material,
            "findings_requiring_review": affected_findings,
            "threshold": f"relative change >= {material_rel_change:.0%} (proposed - confirm with sponsor)"}


def flag_revalidation(pdir, comparison: dict, user: str) -> list[str]:
    state = load_state(pdir)
    linked = set(comparison["material_kpis"]) | set(comparison["findings_requiring_review"])
    if comparison["material_kpis"]:
        linked.add(comparison["from"])  # approval of the whole results version
    flagged = []
    for a in state["registers"]["approvals"]:
        if a.get("linked_id") in linked and a.get("status") == "Approved":
            a["status"] = "Requires revalidation"
            flagged.append(a["id"])
    log(state, user, "flag_revalidation", json.dumps(flagged))
    save_state(pdir, state)
    return flagged


def promote(pdir, vid: str, user: str, approver_name: str) -> None:
    """Promote a reviewed version to 'Approved'. Requires promote permission and a named approver."""
    state = load_state(pdir)
    require(state, user, "promote")
    if not approver_name:
        raise ValueError("A named approver is required to promote results")
    for v in state["versions"]:
        if v["version"] == vid:
            v["status"] = f"Approved by {approver_name}"
            v["approved_at"] = now()
        elif v["status"].startswith("Approved"):
            v["status"] = "Superseded"
    state["approved_version"] = vid
    path = Path(pdir) / "versions" / vid / "results.json"
    b = json.loads(path.read_text(encoding="utf-8"))
    b["status"] = f"Approved by {approver_name}"
    path.write_text(json.dumps(b, indent=2, default=str), encoding="utf-8")
    log(state, user, "promote", f"{vid} approved by {approver_name}")
    save_state(pdir, state)


def rollback(pdir, vid: str, user: str, reason: str) -> None:
    state = load_state(pdir)
    require(state, user, "promote")
    if vid not in [v["version"] for v in state["versions"]]:
        raise KeyError(vid)
    prev = state["approved_version"]
    state["approved_version"] = vid
    log(state, user, "rollback", f"{prev} -> {vid}: {reason}")
    save_state(pdir, state)
