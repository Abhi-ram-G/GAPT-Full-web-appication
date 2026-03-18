import pathlib
lines=pathlib.Path('frontend/pages/AccessControl.tsx').read_text().splitlines()
for i in range(70, 95):
    print(f'{i:03d}: {lines[i-1]}')
