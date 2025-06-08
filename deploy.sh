#!/bin/bash

# Кольори для виводу
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Starting deployment process ===${NC}"

# Перевірка статусу git
echo -e "${BLUE}Checking git status...${NC}"
git status

# Додавання всіх змін
echo -e "${BLUE}Adding all changes...${NC}"
git add .

# Запит на коміт
echo -e "${BLUE}Enter commit message:${NC}"
read commit_message

# Створення коміту
echo -e "${BLUE}Creating commit...${NC}"
git commit -m "$commit_message"

# Пуш в репозиторій
echo -e "${BLUE}Pushing to repository...${NC}"
git push origin main

echo -e "${GREEN}=== Deployment completed ===${NC}"
echo -e "${BLUE}Check your Vercel dashboard for deployment status${NC}" 