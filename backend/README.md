# InstrumentVision Audio Backend

FastAPI wrapper for the provided legacy `music-instrument-classifier-master/last_svc.model`.

## Run

```powershell
python -m venv backend/.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

The frontend expects `POST http://localhost:8000/api/audio-classify` by default.

The model was created with Python 2 and sklearn 0.18.1, so this backend includes a compatibility shim and returns graceful notes if the model cannot be loaded in a modern environment.
