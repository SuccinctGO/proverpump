# Кольори для виводу
$Green = [System.ConsoleColor]::Green
$Blue = [System.ConsoleColor]::Blue

Write-Host "=== Starting deployment process ===" -ForegroundColor $Blue

# Перевірка статусу git
Write-Host "Checking git status..." -ForegroundColor $Blue
git status

# Додавання всіх змін
Write-Host "Adding all changes..." -ForegroundColor $Blue
git add .

# Запит на коміт
Write-Host "Enter commit message:" -ForegroundColor $Blue
$commit_message = Read-Host

# Створення коміту
Write-Host "Creating commit..." -ForegroundColor $Blue
git commit -m $commit_message

# Пуш в репозиторій
Write-Host "Pushing to repository..." -ForegroundColor $Blue
git push origin main

Write-Host "=== Deployment completed ===" -ForegroundColor $Green
Write-Host "Check your Vercel dashboard for deployment status" -ForegroundColor $Blue 