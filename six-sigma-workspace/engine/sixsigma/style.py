"""Shared palette + spreadsheet styling (palette from config/palette.json)."""
import json
from pathlib import Path

from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

PALETTE = json.loads((Path(__file__).resolve().parents[2] / "config" / "palette.json").read_text())
B, N = PALETTE["brand"], PALETTE["neutral"]
hexs = lambda h: h.lstrip("#").upper()  # noqa: E731

FONT = "Calibri"
TITLE = Font(name=FONT, size=16, bold=True, color=hexs(N["ink"]))
SUB = Font(name=FONT, size=10, italic=True, color=hexs(N["ink_soft"]))
HEAD = Font(name=FONT, size=10, bold=True, color=hexs(N["ink"]))
BODY = Font(name=FONT, size=10, color=hexs(N["ink"]))
FILL_HEAD = PatternFill("solid", fgColor=hexs(B["cream"]))
FILL_REQ = PatternFill("solid", fgColor=hexs(B["peach"]))
FILL_OK = PatternFill("solid", fgColor=hexs(B["sage"]))
FILL_BAD = PatternFill("solid", fgColor=hexs(B["coral"]))
THIN = Side(style="thin", color=hexs(N["rule"]))
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")


def header_row(ws, row, headers, required=(), widths=None):
    for i, h in enumerate(headers, 1):
        c = ws.cell(row=row, column=i, value=h + (" *" if h in required else ""))
        c.font, c.fill, c.border, c.alignment = HEAD, (FILL_REQ if h in required else FILL_HEAD), BOX, WRAP
        ws.column_dimensions[c.column_letter].width = (widths or {}).get(h, max(14, min(40, len(h) + 6)))
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def title_block(ws, title, subtitle, doc_status="Draft - pending approval"):
    ws["A1"], ws["A1"].font = title, TITLE
    ws["A2"], ws["A2"].font = subtitle, SUB
    ws["A3"], ws["A3"].font = f"Document status: {doc_status}", SUB
    ws.sheet_view.showGridLines = False


def body_rows(ws, start_row, rows, ncols):
    for r, row in enumerate(rows, start_row):
        for c in range(1, ncols + 1):
            cell = ws.cell(row=r, column=c, value=row[c - 1] if c - 1 < len(row) else None)
            cell.font, cell.border, cell.alignment = BODY, BOX, WRAP
