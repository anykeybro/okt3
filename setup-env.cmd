@echo off
echo Настройка переменных окружения для Zabbix...

if not exist .env.development (
    echo Копирование .env.development.example в .env.development...
    copy .env.development.example .env.development
    echo ✓ Файл .env.development создан
) else (
    echo ⚠ Файл .env.development уже существует
)

if not exist .env.production (
    echo Копирование .env.production.example в .env.production...
    copy .env.production.example .env.production
    echo ✓ Файл .env.production создан
    echo.
    echo ⚠ ВАЖНО: Не забудьте изменить пароль в .env.production!
    echo   Найдите строку POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
    echo   и замените на безопасный пароль.
) else (
    echo ⚠ Файл .env.production уже существует
)

echo.
echo Настройка завершена! Теперь можно запускать:
echo   yarn dev:zabbix  - только Zabbix
echo   yarn dev         - Zabbix + приложение
echo.
pause