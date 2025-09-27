// Типы для Telegram бота

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  contact?: TelegramContact;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramKeyboard {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramReplyKeyboard {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  selective?: boolean;
}

export interface TelegramKeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
}

// Состояния пользователя в боте
export enum BotUserState {
  INITIAL = 'INITIAL',
  WAITING_PHONE = 'WAITING_PHONE',
  AUTHENTICATED = 'AUTHENTICATED',
  SELECTING_ACCOUNT = 'SELECTING_ACCOUNT',
  VIEWING_BALANCE = 'VIEWING_BALANCE',
  VIEWING_PAYMENTS = 'VIEWING_PAYMENTS'
}

// Сессия пользователя бота
export interface BotUserSession {
  chatId: string;
  userId: number;
  state: BotUserState;
  clientId?: string;
  selectedAccountId?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Команды бота
export enum BotCommand {
  START = '/start',
  HELP = '/help',
  BALANCE = '/balance',
  PAYMENTS = '/payments',
  TARIFF = '/tariff',
  ACCOUNTS = '/accounts'
}

// Callback данные
export interface CallbackData {
  action: string;
  data?: Record<string, any>;
}

// Типы действий в callback
export enum CallbackAction {
  SELECT_ACCOUNT = 'select_account',
  VIEW_BALANCE = 'view_balance',
  VIEW_PAYMENTS = 'view_payments',
  VIEW_TARIFF = 'view_tariff',
  BACK_TO_MENU = 'back_to_menu',
  REFRESH_DATA = 'refresh_data'
}

// Ответ от Telegram API
export interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

// Информация о боте
export interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}