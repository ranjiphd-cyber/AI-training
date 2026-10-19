"""Build the annual review dashboard from data exported by the TA Head workspace.

Usage: python3 tools/build_annual_review.py <review_data.json> <output.html>

The output embeds everyone's review data. Keep it private to the TA Head; never commit it.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / 'review' / 'annual_review_template.html'


def main(src, out):
    data = json.loads(pathlib.Path(src).read_text(encoding='utf-8'))
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = TEMPLATE.read_text(encoding='utf-8').replace('/*__DATA__*/null', blob, 1)
    pathlib.Path(out).write_text(html, encoding='utf-8')
    print('built', len(html), 'bytes')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
