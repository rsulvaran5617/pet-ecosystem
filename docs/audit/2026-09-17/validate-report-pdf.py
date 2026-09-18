import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(os.environ['TEMP']) / 'pet-canvas-qa-20260916'))
import pymupdf

base = Path(__file__).resolve().parent
doc = pymupdf.open(base / 'INFORME_AUDITORIA.pdf')
text = '\n'.join(page.get_text() for page in doc)
canvas = (base.parent.parent / 'functional/PET_ECOSYSTEM_CANVAS_FUNCIONAL.md').read_text(encoding='utf-8')
ids = re.findall(r'^### ([COPFDTVA]\d{2}) ', canvas, re.M)
missing = [item for item in ids if not re.search(r'\b' + item + r'\b', text)]
outside = []
for number, page in enumerate(doc, 1):
    for block in page.get_text('blocks'):
        rect = pymupdf.Rect(block[:4])
        if rect.x0 < -1 or rect.y0 < -1 or rect.x1 > page.rect.width + 1 or rect.y1 > page.rect.height + 1:
            outside.append({'page': number, 'rect': list(rect)})
report = {'pages': len(doc), 'functionalIds': len(ids), 'missingIds': missing, 'outOfPageText': outside}
(base / 'evidence/report-pdf-validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
doc[0].get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2)).save(base / 'evidence/report-pdf-first.png')
doc[-1].get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2)).save(base / 'evidence/report-pdf-last.png')
print(json.dumps(report))
assert len(ids) == 110 and not missing and not outside
