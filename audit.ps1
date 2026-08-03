$ErrorActionPreference = "Continue"

Write-Output "=== NODE ===" >> audit_results.txt
node -v >> audit_results.txt 2>&1

Write-Output "=== PYTHON ===" >> audit_results.txt
python --version >> audit_results.txt 2>&1

Write-Output "=== FIREBASE CLI ===" >> audit_results.txt
firebase --version >> audit_results.txt 2>&1

Write-Output "=== GCLOUD CLI ===" >> audit_results.txt
gcloud --version >> audit_results.txt 2>&1

Write-Output "=== GCLOUD CONFIG ===" >> audit_results.txt
gcloud config list >> audit_results.txt 2>&1

Write-Output "=== FIREBASE PROJECTS ===" >> audit_results.txt
firebase projects:list >> audit_results.txt 2>&1

Write-Output "=== PACKAGE.JSON FILES ===" >> audit_results.txt
Get-ChildItem -Path . -Recurse -Filter "package.json" | Where-Object { $_.FullName -notmatch "node_modules" } | Select-Object FullName >> audit_results.txt 2>&1

Write-Output "=== PYTHON AGENT FILES ===" >> audit_results.txt
Get-ChildItem -Path . -Recurse -Filter "*.py" | Where-Object { $_.FullName -match "agent" -and $_.FullName -notmatch "node_modules|\.venv|venv" } | Select-Object FullName >> audit_results.txt 2>&1

Write-Output "=== TS AGENT FILES ===" >> audit_results.txt
Get-ChildItem -Path .\functions\src\agents -Filter "*.ts" | Select-Object FullName >> audit_results.txt 2>&1

Write-Output "=== FIRESTORE RULES ===" >> audit_results.txt
Get-Content firestore.rules >> audit_results.txt 2>&1

Write-Output "=== FIREBASE HOSTING SITES ===" >> audit_results.txt
firebase hosting:sites:list >> audit_results.txt 2>&1

Write-Output "=== GCLOUD RUN SERVICES ===" >> audit_results.txt
gcloud run services list >> audit_results.txt 2>&1

Write-Output "=== GCLOUD SERVICES ENABLED ===" >> audit_results.txt
gcloud services list --enabled >> audit_results.txt 2>&1
