#!/usr/bin/env python3
"""Embed a vendors.json dataset into app.html.

  python3 inject.py app.html vendors.json out-fragment.html   # artifact page (no <html> skeleton)
  python3 inject.py app.html - index.html --standalone          # empty dataset, full HTML document
"""
import json, sys
src, data_path, out = sys.argv[1:4]
standalone = "--standalone" in sys.argv
page = open(src, encoding="utf-8").read()
data = '{"meta":{},"vendors":[]}' if data_path == "-" else json.dumps(json.load(open(data_path, encoding="utf-8")), ensure_ascii=False, separators=(",", ":"))
data = data.replace("</", "<\\/")
marker = '/*VENDOR_DATA*/{"meta":{},"vendors":[]}'
assert marker in page
page = page.replace(marker, "/*VENDOR_DATA*/" + data)
if standalone:
    page = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>\n'
            + page + "\n</body></html>\n")
open(out, "w", encoding="utf-8").write(page)
print("wrote", out, len(page), "bytes")
