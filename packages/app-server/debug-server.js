const express = require('express');
const cors = require('cors');

const app = express();

// Простое логирование
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Базовые middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Базовые маршруты
app.get('/', (req, res) => {
    res.json({
        message: 'OK-Telecom Billing API Server (Debug)',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        documentation: '/api-docs'
    });
});

// Базовый health check (простой)
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'app-server-debug'
    });
});

// Health check с проверкой базы данных (без реальной проверки)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'simulated',
        uptime: process.uptime(),
        service: 'app-server-debug'
    });
});

const port = 3001;
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Debug server запущен на порту ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Получен SIGINT, завершаем работу...');
    server.close(() => {
        console.log('Debug сервер остановлен');
        process.exit(0);
    });
});