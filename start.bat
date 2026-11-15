@echo off
echo Starting Pathwise AI Services...

echo Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "Pathwise AI - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Starting Frontend (Vite on http://localhost:5173)...
start "Pathwise AI - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==============================================
echo  Pathwise AI is starting up!
echo  Frontend URL: http://localhost:5173
echo  Backend API:  http://127.0.0.1:8000
echo  API Docs:     http://127.0.0.1:8000/docs
echo ==============================================
