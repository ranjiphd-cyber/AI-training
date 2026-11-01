"""Render the project dashboard from ONE results bundle.

    python generators/build_dashboard.py <results.json> <out.html>

The output is a single self-contained HTML file. The figures come from the same
bundle the deck uses, so the two agree. Record-level rows are embedded only
when the bundle has already pseudonymised them.
"""
import json
import sys
from pathlib import Path

TEMPLATE = Path(__file__).with_name("dashboard_template.html")


def build(bundle_path, out_path):
    bundle = json.loads(Path(bundle_path).read_text(encoding="utf-8"))
    payload = json.dumps(bundle, default=str).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8").replace("/*__BUNDLE__*/null", payload)
    Path(out_path).write_text(html, encoding="utf-8")
    return out_path


if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2]))
