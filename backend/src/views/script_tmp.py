from pathlib import Path
path = Path(r"c:/Users/genoray/OneDrive - GENORAY/바탕 화면/Web app/backend/src/views/requests.ts")
text = path.read_text()
start = text.index("// Simple update of stage/status")
print(text[start:start+800])
