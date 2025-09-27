// Сервис Telegram бота для работы с абонентами
import { PrismaClient } from '@prisma/client';
import { TelegramService } from '../../notifications/services/telegram.service';
import { 
  TelegramUpdate, 
  TelegramMessage, 
  TelegramCallbackQuery,
  BotUserState,
  BotUserSession,
  BotCommand,
  CallbackData,
  CallbackAction,
  TelegramKeyboard,
  TelegramReplyKeyboard
} from '../types';

export class TelegramBotService {
  private prisma: PrismaClient;
  private telegramService: TelegramService;
  private userSessions: Map<string, BotUserSession> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.telegramService = new TelegramService();
  }

  /**
   * Обработка входящих обновлений от Telegram
   */
  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('❌ Ошибка обработки Telegram обновления:', error);
    }
  }

  /**
   * Обработка текстовых сообщений
   */
  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id.toString();
    const userId = message.from.id;
    const text = message.text?.trim();

    // Получаем или создаем сессию пользователя
    let session = this.getUserSession(chatId, userId);

    // Обработка команд
    if (text?.startsWith('/')) {
      await this.handleCommand(text as BotCommand, session);
      return;
    }

    // Обработка контакта (номер телефона)
    if (message.contact) {
      await this.handlePhoneContact(message.contact.phone_number, session);
      return;
    }

    // Обработка состояний
    switch (session.state) {
      case BotUserState.INITIAL:
        await this.sendWelcomeMessage(chatId);
        break;
      case BotUserState.WAITING_PHONE:
        await this.sendPhoneRequest(chatId);
        break;
      default:
        await this.sendMainMenu(chatId);
    }

    this.updateUserSession(session);
  }

  /**
   * Обработка callback запросов (нажатия на кнопки)
   */
  private async handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const chatId = callbackQuery.message?.chat.id.toString();
    const userId = callbackQuery.from.id;
    
    if (!chatId) return;

    const session = this.getUserSession(chatId, userId);
    
    try {
      const callbackData: CallbackData = JSON.parse(callbackQuery.data || '{}');
      
      switch (callbackData.action) {
        case CallbackAction.SELECT_ACCOUNT:
          await this.handleSelectAccount(callbackData.data?.accountId, session);
          break;
        case CallbackAction.VIEW_BALANCE:
          await this.handleViewBalance(session);
          break;
        case CallbackAction.VIEW_PAYMENTS:
          await this.handleViewPayments(session);
          break;
        case CallbackAction.VIEW_TARIFF:
          await this.handleViewTariff(session);
          break;
        case CallbackAction.BACK_TO_MENU:
          await this.sendMainMenu(chatId);
          break;
        case CallbackAction.REFRESH_DATA:
          await this.handleRefreshData(session);
          break;
      }

      // Отвечаем на callback query
      await this.answerCallbackQuery(callbackQuery.id);
      
    } catch (error) {
      console.error('❌ Ошибка обработки callback query:', error);
      await this.answerCallbackQuery(callbackQuery.id, 'Произошла ошибка');
    }

    this.updateUserSession(session);
  }

  /**
   * Обработка команд бота
   */
  private async handleCommand(command: BotCommand, session: BotUserSession): Promise<void> {
    const chatId = session.chatId;

    switch (command) {
      case BotCommand.START:
        await this.sendWelcomeMessage(chatId);
        session.state = BotUserState.INITIAL;
        break;
      case BotCommand.HELP:
        await this.sendHelpMessage(chatId);
        break;
      case BotCommand.BALANCE:
        if (session.state === BotUserState.AUTHENTICATED) {
          await this.handleViewBalance(session);
        } else {
          await this.sendAuthRequiredMessage(chatId);
        }
        break;
      case BotCommand.PAYMENTS:
        if (session.state === BotUserState.AUTHENTICATED) {
          await this.handleViewPayments(session);
        } else {
          await this.sendAuthRequiredMessage(chatId);
        }
        break;
      case BotCommand.TARIFF:
        if (session.state === BotUserState.AUTHENTICATED) {
          await this.handleViewTariff(session);
        } else {
          await this.sendAuthRequiredMessage(chatId);
        }
        break;
      case BotCommand.ACCOUNTS:
        if (session.state === BotUserState.AUTHENTICATED) {
          await this.sendAccountSelection(session);
        } else {
          await this.sendAuthRequiredMessage(chatId);
        }
        break;
    }
  }

  /**
   * Обработка номера телефона
   */
  private async handlePhoneContact(phoneNumber: string, session: BotUserSession): Promise<void> {
    try {
      // Нормализуем номер телефона
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Ищем клиента по номеру телефона
      const client = await this.prisma.client.findFirst({
        where: {
          phones: {
            has: normalizedPhone
          }
        },
        include: {
          accounts: {
            include: {
              tariff: true
            }
          }
        }
      });

      if (!client) {
        await this.telegramService.sendMessage(
          session.chatId,
          '❌ Абонент с таким номером телефона не найден.\n\nОбратитесь к администратору для регистрации.'
        );
        return;
      }

      // Обновляем Telegram ID клиента
      await this.prisma.client.update({
        where: { id: client.id },
        data: { telegramId: session.userId.toString() }
      });

      session.clientId = client.id;
      session.phone = normalizedPhone;
      session.state = BotUserState.AUTHENTICATED;

      await this.telegramService.sendMessage(
        session.chatId,
        `✅ Добро пожаловать, ${client.firstName} ${client.lastName}!\n\nВы успешно авторизованы в системе.`
      );

      // Если у клиента несколько лицевых счетов, предлагаем выбрать
      if (client.accounts.length > 1) {
        await this.sendAccountSelection(session);
      } else if (client.accounts.length === 1) {
        session.selectedAccountId = client.accounts[0].id;
        await this.sendMainMenu(session.chatId);
      } else {
        await this.telegramService.sendMessage(
          session.chatId,
          '⚠️ У вас нет активных лицевых счетов.\n\nОбратитесь к администратору.'
        );
      }

    } catch (error) {
      console.error('❌ Ошибка обработки номера телефона:', error);
      await this.telegramService.sendMessage(
        session.chatId,
        '❌ Произошла ошибка при авторизации. Попробуйте позже.'
      );
    }
  }

  /**
   * Отправка приветственного сообщения
   */
  private async sendWelcomeMessage(chatId: string): Promise<void> {
    const message = `
🏠 <b>Добро пожаловать в личный кабинет OK-Telecom!</b>

Для доступа к информации о ваших услугах необходимо авторизоваться.

Нажмите кнопку ниже, чтобы отправить ваш номер телефона.
    `.trim();

    const keyboard: TelegramReplyKeyboard = {
      keyboard: [[
        { text: '📱 Отправить номер телефона', request_contact: true }
      ]],
      resize_keyboard: true,
      one_time_keyboard: true
    };

    await this.telegramService.sendMessage(chatId, message);
    // Отправляем клавиатуру отдельным сообщением
    await this.sendMessageWithReplyKeyboard(chatId, 'Нажмите кнопку для отправки номера:', keyboard);
  }

  /**
   * Отправка запроса номера телефона
   */
  private async sendPhoneRequest(chatId: string): Promise<void> {
    const message = `
📱 <b>Требуется авторизация</b>

Пожалуйста, отправьте ваш номер телефона, нажав кнопку ниже.
    `.trim();

    const keyboard: TelegramReplyKeyboard = {
      keyboard: [[
        { text: '📱 Отправить номер телефона', request_contact: true }
      ]],
      resize_keyboard: true,
      one_time_keyboard: true
    };

    await this.sendMessageWithReplyKeyboard(chatId, message, keyboard);
  }

  /**
   * Отправка главного меню
   */
  private async sendMainMenu(chatId: string): Promise<void> {
    const message = `
🏠 <b>Главное меню</b>

Выберите действие:
    `.trim();

    const keyboard: TelegramKeyboard = {
      inline_keyboard: [
        [
          { text: '💰 Баланс', callback_data: JSON.stringify({ action: CallbackAction.VIEW_BALANCE }) },
          { text: '📊 Тариф', callback_data: JSON.stringify({ action: CallbackAction.VIEW_TARIFF }) }
        ],
        [
          { text: '💳 История платежей', callback_data: JSON.stringify({ action: CallbackAction.VIEW_PAYMENTS }) }
        ],
        [
          { text: '📋 Лицевые счета', callback_data: JSON.stringify({ action: CallbackAction.SELECT_ACCOUNT }) }
        ],
        [
          { text: '🔄 Обновить', callback_data: JSON.stringify({ action: CallbackAction.REFRESH_DATA }) }
        ]
      ]
    };

    await this.telegramService.sendMessageWithKeyboard(chatId, message, keyboard.inline_keyboard);
  }

  /**
   * Отправка выбора лицевого счета
   */
  private async sendAccountSelection(session: BotUserSession): Promise<void> {
    if (!session.clientId) return;

    try {
      const client = await this.prisma.client.findUnique({
        where: { id: session.clientId },
        include: {
          accounts: {
            include: {
              tariff: true
            }
          }
        }
      });

      if (!client || client.accounts.length === 0) {
        await this.telegramService.sendMessage(
          session.chatId,
          '❌ Лицевые счета не найдены.'
        );
        return;
      }

      const message = `
📋 <b>Выберите лицевой счет:</b>
      `.trim();

      const keyboard: TelegramKeyboard = {
        inline_keyboard: client.accounts.map(account => [
          {
            text: `${account.accountNumber} - ${account.tariff.name} (${account.balance.toFixed(2)} ₽)`,
            callback_data: JSON.stringify({
              action: CallbackAction.SELECT_ACCOUNT,
              data: { accountId: account.id }
            })
          }
        ])
      };

      // Добавляем кнопку "Назад"
      keyboard.inline_keyboard.push([
        { text: '🔙 Назад', callback_data: JSON.stringify({ action: CallbackAction.BACK_TO_MENU }) }
      ]);

      await this.telegramService.sendMessageWithKeyboard(session.chatId, message, keyboard.inline_keyboard);

    } catch (error) {
      console.error('❌ Ошибка получения лицевых счетов:', error);
      await this.telegramService.sendMessage(
        session.chatId,
        '❌ Ошибка получения данных. Попробуйте позже.'
      );
    }
  }

  /**
   * Обработка выбора лицевого счета
   */
  private async handleSelectAccount(accountId: string, session: BotUserSession): Promise<void> {
    if (!accountId) return;

    session.selectedAccountId = accountId;
    session.state = BotUserState.AUTHENTICATED;

    await this.telegramService.sendMessage(
      session.chatId,
      '✅ Лицевой счет выбран!'
    );

    await this.sendMainMenu(session.chatId);
  }

  /**
   * Просмотр баланса
   */
  private async handleViewBalance(session: BotUserSession): Promise<void> {
    if (!session.selectedAccountId) {
      await this.sendAccountSelection(session);
      return;
    }

    try {
      const account = await this.prisma.account.findUnique({
        where: { id: session.selectedAccountId },
        include: {
          tariff: true,
          client: true
        }
      });

      if (!account) {
        await this.telegramService.sendMessage(
          session.chatId,
          '❌ Лицевой счет не найден.'
        );
        return;
      }

      // Рассчитываем остаток дней (для предоплатных тарифов)
      let daysLeft = 0;
      if (account.tariff.billingType === 'PREPAID_MONTHLY' && account.balance > 0) {
        daysLeft = Math.floor(account.balance / (account.tariff.price / 30));
      }

      const statusEmoji = account.status === 'ACTIVE' ? '🟢' : 
                         account.status === 'BLOCKED' ? '🔴' : '🟡';

      const message = `
💰 <b>Информация о балансе</b>

👤 <b>Абонент:</b> ${account.client.firstName} ${account.client.lastName}
🏷️ <b>Лицевой счет:</b> ${account.accountNumber}
💳 <b>Баланс:</b> ${account.balance.toFixed(2)} ₽
${statusEmoji} <b>Статус:</b> ${this.getStatusText(account.status)}

📊 <b>Тариф:</b> ${account.tariff.name}
💵 <b>Стоимость:</b> ${account.tariff.price.toFixed(2)} ₽/${account.tariff.billingType === 'PREPAID_MONTHLY' ? 'мес' : 'час'}
${account.tariff.billingType === 'PREPAID_MONTHLY' ? `⏰ <b>Остаток дней:</b> ${daysLeft}` : ''}

🌐 <b>Скорость:</b> ${account.tariff.speedDown}/${account.tariff.speedUp} Мбит/с
      `.trim();

      const keyboard: TelegramKeyboard = {
        inline_keyboard: [
          [
            { text: '💳 История платежей', callback_data: JSON.stringify({ action: CallbackAction.VIEW_PAYMENTS }) },
            { text: '📊 Подробнее о тарифе', callback_data: JSON.stringify({ action: CallbackAction.VIEW_TARIFF }) }
          ],
          [
            { text: '🔄 Обновить', callback_data: JSON.stringify({ action: CallbackAction.REFRESH_DATA }) },
            { text: '🔙 Главное меню', callback_data: JSON.stringify({ action: CallbackAction.BACK_TO_MENU }) }
          ]
        ]
      };

      await this.telegramService.sendMessageWithKeyboard(session.chatId, message, keyboard.inline_keyboard);

    } catch (error) {
      console.error('❌ Ошибка получения баланса:', error);
      await this.telegramService.sendMessage(
        session.chatId,
        '❌ Ошибка получения данных. Попробуйте позже.'
      );
    }
  }

  /**
   * Просмотр истории платежей
   */
  private async handleViewPayments(session: BotUserSession): Promise<void> {
    if (!session.selectedAccountId) {
      await this.sendAccountSelection(session);
      return;
    }

    try {
      const payments = await this.prisma.payment.findMany({
        where: { 
          accountId: session.selectedAccountId,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          account: true
        }
      });

      if (payments.length === 0) {
        await this.telegramService.sendMessage(
          session.chatId,
          '📝 История платежей пуста.'
        );
        return;
      }

      let message = `💳 <b>История платежей</b>\n\n`;
      
      payments.forEach((payment, index) => {
        const date = payment.createdAt.toLocaleDateString('ru-RU');
        const time = payment.createdAt.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const sourceText = payment.source === 'ROBOKASSA' ? 'Онлайн' : 'Касса';
        
        message += `${index + 1}. <b>${payment.amount.toFixed(2)} ₽</b>\n`;
        message += `   📅 ${date} ${time}\n`;
        message += `   💼 ${sourceText}\n`;
        if (payment.comment) {
          message += `   💬 ${payment.comment}\n`;
        }
        message += `\n`;
      });

      const keyboard: TelegramKeyboard = {
        inline_keyboard: [
          [
            { text: '💰 Баланс', callback_data: JSON.stringify({ action: CallbackAction.VIEW_BALANCE }) },
            { text: '🔙 Главное меню', callback_data: JSON.stringify({ action: CallbackAction.BACK_TO_MENU }) }
          ]
        ]
      };

      await this.telegramService.sendMessageWithKeyboard(session.chatId, message, keyboard.inline_keyboard);

    } catch (error) {
      console.error('❌ Ошибка получения истории платежей:', error);
      await this.telegramService.sendMessage(
        session.chatId,
        '❌ Ошибка получения данных. Попробуйте позже.'
      );
    }
  }

  /**
   * Просмотр информации о тарифе
   */
  private async handleViewTariff(session: BotUserSession): Promise<void> {
    if (!session.selectedAccountId) {
      await this.sendAccountSelection(session);
      return;
    }

    try {
      const account = await this.prisma.account.findUnique({
        where: { id: session.selectedAccountId },
        include: {
          tariff: true
        }
      });

      if (!account) {
        await this.telegramService.sendMessage(
          session.chatId,
          '❌ Лицевой счет не найден.'
        );
        return;
      }

      // Получаем услуги тарифа
      const services = await this.prisma.service.findMany({
        where: {
          id: { in: account.tariff.serviceIds }
        }
      });

      const billingTypeText = account.tariff.billingType === 'PREPAID_MONTHLY' ? 
        'Предоплата (месячная)' : 'Почасовая тарификация';

      let message = `
📊 <b>Информация о тарифе</b>

🏷️ <b>Название:</b> ${account.tariff.name}
💵 <b>Стоимость:</b> ${account.tariff.price.toFixed(2)} ₽/${account.tariff.billingType === 'PREPAID_MONTHLY' ? 'мес' : 'час'}
⚙️ <b>Тип тарификации:</b> ${billingTypeText}

🌐 <b>Скорость интернета:</b>
   ⬇️ Загрузка: ${account.tariff.speedDown} Мбит/с
   ⬆️ Отдача: ${account.tariff.speedUp} Мбит/с

📋 <b>Включенные услуги:</b>
      `.trim();

      if (services.length > 0) {
        services.forEach(service => {
          const serviceEmoji = service.type === 'INTERNET' ? '🌐' :
                              service.type === 'IPTV' ? '📺' : '☁️';
          message += `\n   ${serviceEmoji} ${service.name}`;
        });
      } else {
        message += '\n   Нет подключенных услуг';
      }

      if (account.tariff.description) {
        message += `\n\n📝 <b>Описание:</b>\n${account.tariff.description}`;
      }

      const keyboard: TelegramKeyboard = {
        inline_keyboard: [
          [
            { text: '💰 Баланс', callback_data: JSON.stringify({ action: CallbackAction.VIEW_BALANCE }) },
            { text: '💳 Платежи', callback_data: JSON.stringify({ action: CallbackAction.VIEW_PAYMENTS }) }
          ],
          [
            { text: '🔙 Главное меню', callback_data: JSON.stringify({ action: CallbackAction.BACK_TO_MENU }) }
          ]
        ]
      };

      await this.telegramService.sendMessageWithKeyboard(session.chatId, message, keyboard.inline_keyboard);

    } catch (error) {
      console.error('❌ Ошибка получения информации о тарифе:', error);
      await this.telegramService.sendMessage(
        session.chatId,
        '❌ Ошибка получения данных. Попробуйте позже.'
      );
    }
  }

  /**
   * Обновление данных
   */
  private async handleRefreshData(session: BotUserSession): Promise<void> {
    await this.telegramService.sendMessage(
      session.chatId,
      '🔄 Данные обновлены!'
    );
    
    await this.sendMainMenu(session.chatId);
  }

  /**
   * Отправка сообщения о необходимости авторизации
   */
  private async sendAuthRequiredMessage(chatId: string): Promise<void> {
    await this.telegramService.sendMessage(
      chatId,
      '🔐 Для использования этой команды необходимо авторизоваться.\n\nИспользуйте команду /start'
    );
  }

  /**
   * Отправка справки
   */
  private async sendHelpMessage(chatId: string): Promise<void> {
    const message = `
ℹ️ <b>Справка по боту OK-Telecom</b>

<b>Доступные команды:</b>
/start - Начать работу с ботом
/help - Показать эту справку
/balance - Показать баланс
/payments - История платежей
/tariff - Информация о тарифе
/accounts - Выбрать лицевой счет

<b>Возможности бота:</b>
• Просмотр баланса и статуса
• История платежей
• Информация о тарифе
• Управление несколькими лицевыми счетами
• Получение уведомлений

Для начала работы отправьте команду /start
    `.trim();

    await this.telegramService.sendMessage(chatId, message);
  }

  /**
   * Отправка сообщения с reply клавиатурой
   */
  private async sendMessageWithReplyKeyboard(
    chatId: string, 
    message: string, 
    keyboard: TelegramReplyKeyboard
  ): Promise<void> {
    // Используем прямой вызов к Telegram API для reply клавиатуры
    // так как TelegramService не поддерживает reply клавиатуры
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.telegramService['botToken']}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения с reply клавиатурой:', error);
    }
  }

  /**
   * Ответ на callback query
   */
  private async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.telegramService['botToken']}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Ошибка ответа на callback query:', error);
    }
  }

  /**
   * Получение или создание сессии пользователя
   */
  private getUserSession(chatId: string, userId: number): BotUserSession {
    const sessionKey = `${chatId}_${userId}`;
    
    if (!this.userSessions.has(sessionKey)) {
      const session: BotUserSession = {
        chatId,
        userId,
        state: BotUserState.INITIAL,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userSessions.set(sessionKey, session);
    }

    return this.userSessions.get(sessionKey)!;
  }

  /**
   * Обновление сессии пользователя
   */
  private updateUserSession(session: BotUserSession): void {
    session.updatedAt = new Date();
    const sessionKey = `${session.chatId}_${session.userId}`;
    this.userSessions.set(sessionKey, session);
  }

  /**
   * Нормализация номера телефона
   */
  private normalizePhoneNumber(phone: string): string {
    // Убираем все символы кроме цифр
    let normalized = phone.replace(/\D/g, '');
    
    // Если номер начинается с 8, заменяем на 7
    if (normalized.startsWith('8')) {
      normalized = '7' + normalized.slice(1);
    }
    
    // Если номер начинается с 7, добавляем +
    if (normalized.startsWith('7')) {
      normalized = '+' + normalized;
    }
    
    return normalized;
  }

  /**
   * Получение текста статуса аккаунта
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Активен';
      case 'BLOCKED':
        return 'Заблокирован';
      case 'SUSPENDED':
        return 'Приостановлен';
      default:
        return 'Неизвестно';
    }
  }

  /**
   * Очистка старых сессий (вызывается периодически)
   */
  public cleanupOldSessions(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 часа

    for (const [key, session] of this.userSessions.entries()) {
      if (now.getTime() - session.updatedAt.getTime() > maxAge) {
        this.userSessions.delete(key);
      }
    }
  }

  /**
   * Отправка уведомления через бота
   */
  async sendNotification(clientId: string, message: string): Promise<boolean> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client?.telegramId) {
        return false;
      }

      const result = await this.telegramService.sendMessage(client.telegramId, message);
      return result.success;
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления через бота:', error);
      return false;
    }
  }
}