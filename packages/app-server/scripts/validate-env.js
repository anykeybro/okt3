#!/usr/bin/env node

/**
 * Скрипт для валидации переменных окружения
 * Использование: node scripts/validate-env.js [--env=development|production]
 */

const path = require('path');
const dotenv = require('dotenv');

// Парсим аргументы командной строки
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const environment = envArg ? envArg.split('=')[1] : process.env.NODE_ENV || 'development';

// Загружаем переменные окружения
const rootPath = path.resolve(__dirname, '../../../../');
const envFile = environment === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(rootPath, envFile);

console.log(`🔍 Валидация конфигурации для окружения: ${environment}`);
console.log(`📁 Файл окружения: ${envPath}`);
console.log('');

// Загружаем переменные
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Ошибка загрузки файла окружения: ${result.error.message}`);
  process.exit(1);
}

// Импортируем и запускаем валидатор
try {
  require('../dist/config/env-validator');
  console.log('');
  console.log('🎉 Валидация завершена успешно!');
} catch (error) {
  console.error(`❌ Ошибка валидации: ${error.message}`);
  process.exit(1);
}