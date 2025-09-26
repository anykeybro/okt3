@echo off
echo 🚀 Запуск проекта с MongoDB репликой...

REM Проверяем наличие .env файлов
if not exist .env.development (
    echo ⚠️  Файл .env.development не найден. Копируем из примера...
    copy .env.development.example .env.development
    echo ✅ Файл .env.development создан. Проверьте настройки!
)

if not exist packages\app-server\.env (
    echo ⚠️  Файл .env для app-server не найден. Копируем из примера...
    copy packages\app-server\.env.example packages\app-server\.env
    echo ✅ Файл .env для app-server создан!
)

REM Проверяем наличие ключа MongoDB
if not exist mongodb-keyfile (
    echo 🔑 Генерируем ключ для MongoDB реплики...
    openssl rand -base64 756 > mongodb-keyfile
    echo ✅ Ключ MongoDB создан
)

echo 🐳 Запускаем Docker контейнеры...
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d

echo ⏳ Ожидаем инициализацию MongoDB реплики (30 секунд)...
timeout /t 30 /nobreak > nul

echo 📊 Проверяем статус MongoDB реплики...
docker exec mongodb-primary-dev mongosh --eval "rs.status()" --quiet

echo 🚀 Запускаем локальный app-server...
start "App Server" cmd /k "cd /d %~dp0packages\app-server && yarn dev"

echo 🎉 Проект запущен!
echo.
echo 📋 Доступные сервисы:
echo   - App Web: http://localhost/
echo   - App Server API: http://localhost/api/health
echo   - App Web Billing: http://localhost/billing
echo   - Zabbix: http://localhost/zabbix/
echo   - Grafana: http://localhost/grafana/
echo   - MongoDB Primary: localhost:27017
echo   - MongoDB Secondary: localhost:27018
echo   - MongoDB Arbiter: localhost:27019
echo.
echo 💡 Для остановки используйте: docker-compose -f docker-compose.dev.yml down
pause