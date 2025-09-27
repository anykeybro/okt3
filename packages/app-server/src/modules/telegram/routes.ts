// Маршруты для Telegram бота
import { Router } from 'express';
import { TelegramController } from './controllers/telegram.controller';

const router = Router();
const telegramController = new TelegramController();

/**
 * @route POST /api/telegram/webhook
 * @desc Обработка webhook от Telegram
 * @access Public (но должен быть защищен на уровне сервера)
 */
router.post('/webhook', telegramController.handleWebhook.bind(telegramController));

/**
 * @route POST /api/telegram/set-webhook
 * @desc Установка webhook для бота
 * @access Private (требует авторизации администратора)
 */
router.post('/set-webhook', telegramController.setWebhook.bind(telegramController));

/**
 * @route DELETE /api/telegram/webhook
 * @desc Удаление webhook
 * @access Private (требует авторизации администратора)
 */
router.delete('/webhook', telegramController.deleteWebhook.bind(telegramController));

/**
 * @route GET /api/telegram/bot-info
 * @desc Получение информации о боте
 * @access Private (требует авторизации администратора)
 */
router.get('/bot-info', telegramController.getBotInfo.bind(telegramController));

/**
 * @route GET /api/telegram/status
 * @desc Проверка статуса бота
 * @access Private (требует авторизации администратора)
 */
router.get('/status', telegramController.checkBotStatus.bind(telegramController));

/**
 * @route POST /api/telegram/send-test
 * @desc Отправка тестового сообщения
 * @access Private (требует авторизации администратора)
 */
router.post('/send-test', telegramController.sendTestMessage.bind(telegramController));

/**
 * @route POST /api/telegram/cleanup-sessions
 * @desc Очистка старых сессий пользователей
 * @access Private (требует авторизации администратора)
 */
router.post('/cleanup-sessions', telegramController.cleanupSessions.bind(telegramController));

export { router as telegramRoutes };