from pathlib import Path
text=Path('backend/registry/models.py').read_text()
print(text[-1200:])
