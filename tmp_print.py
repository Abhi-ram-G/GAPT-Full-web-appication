from pathlib import Path
text=Path('backend/registry/models.py').read_text().splitlines()
for i,line in enumerate(text):
    if 'ExaminationTest' in line:
        for j in range(i, min(len(text), i+60)):
            print(text[j])
