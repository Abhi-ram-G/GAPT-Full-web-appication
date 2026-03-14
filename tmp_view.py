import pathlib 
lines=pathlib.Path(r'frontend/pages/ExaminationPortal.tsx').read_text().splitlines() 
[print(i+1,l) for i,l in enumerate(lines) if 'viewShare' in l] 
