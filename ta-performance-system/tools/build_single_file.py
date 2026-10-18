"""Build single-file versions of the dashboard (all scripts inlined).

dist/TA_Performance_Dashboard.html  - standalone file anyone can open by double-clicking
<out>/artifact.html (optional arg)  - body-only variant for publishing as a claude.ai artifact
Usage: python3 tools/build_single_file.py [artifact_output_path]
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'index.html').read_text(encoding='utf-8')
inline = lambda m: '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</script>'
full = re.sub(r'<script src="(js/[a-z]+\.js)"></script>', inline, src)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'TA_Performance_Dashboard.html').write_text(full, encoding='utf-8')
if len(sys.argv) > 1:
    title = re.search(r'<title>.*?</title>', full, re.S).group(0)
    style = re.search(r'<style>.*?</style>', full, re.S).group(0)
    body = re.search(r'<body>(.*)</body>', full, re.S).group(1)
    pathlib.Path(sys.argv[1]).write_text(title + '\n' + style + '\n' + body, encoding='utf-8')
print('built', len(full), 'bytes')
