$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PYTHONPATH = Join-Path $ScriptDir "crew_core\src"
Set-Location (Join-Path $ScriptDir "backend")
.\.venv\Scripts\activate
uvicorn main:app --reload --port 8000
