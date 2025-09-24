import { ConsoleLogger, formatDate, delay } from '@workspace/shared';

async function main() {
  const logger = new ConsoleLogger();
  
  logger.info('Запуск приложения...');
  logger.info(`Текущая дата: ${formatDate(new Date())}`);
  
  logger.info('Ожидание 1 секунды...');
  await delay(1000);
  
  logger.info('Приложение успешно запущено!');
}

main().catch(error => {
  console.error('Ошибка при запуске приложения:', error);
  process.exit(1);
});