Write-Host "Starting Pathwise AI Services..." -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '.\venv\Scripts\python.exe' -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host "==============================================" -ForegroundColor Green
Write-Host " Pathwise AI is starting up!" -ForegroundColor Green
Write-Host " Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host " Backend:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host " API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Green
