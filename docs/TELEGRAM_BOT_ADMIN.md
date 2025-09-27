# Управление Telegram ботом в административной панели

## Обзор

Административная панель предоставляет интерфейс для управления Telegram ботом, мониторинга его состояния и настройки уведомлений.

## Функции администратора

### 1. Мониторинг статуса бота

```typescript
// Проверка статуса бота
const checkBotStatus = async () => {
  try {
    const response = await fetch('/api/telegram/status');
    const data = await response.json();
    
    if (data.success) {
      console.log('Статус бота:', data.data.status);
      console.log('Онлайн:', data.data.online);
    }
  } catch (error) {
    console.error('Ошибка проверки статуса:', error);
  }
};
```

### 2. Настройка webhook

```typescript
// Установка webhook
const setWebhook = async (webhookUrl: string) => {
  try {
    const response = await fetch('/api/telegram/set-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhookUrl }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Webhook установлен успешно');
    } else {
      console.error('Ошибка установки webhook:', data.error);
    }
  } catch (error) {
    console.error('Ошибка:', error);
  }
};

// Удаление webhook
const deleteWebhook = async () => {
  try {
    const response = await fetch('/api/telegram/webhook', {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Webhook удален успешно');
    }
  } catch (error) {
    console.error('Ошибка удаления webhook:', error);
  }
};
```

### 3. Получение информации о боте

```typescript
// Информация о боте
const getBotInfo = async () => {
  try {
    const response = await fetch('/api/telegram/bot-info');
    const data = await response.json();
    
    if (data.success) {
      console.log('Информация о боте:', data.data);
      // data.data содержит: id, username, first_name, etc.
    }
  } catch (error) {
    console.error('Ошибка получения информации:', error);
  }
};
```

### 4. Отправка тестовых сообщений

```typescript
// Отправка тестового сообщения
const sendTestMessage = async (chatId: string, message: string) => {
  try {
    const response = await fetch('/api/telegram/send-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, message }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Сообщение отправлено, ID:', data.messageId);
    } else {
      console.error('Ошибка отправки:', data.error);
    }
  } catch (error) {
    console.error('Ошибка:', error);
  }
};
```

### 5. Управление сессиями

```typescript
// Очистка старых сессий
const cleanupSessions = async () => {
  try {
    const response = await fetch('/api/telegram/cleanup-sessions', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Сессии очищены');
    }
  } catch (error) {
    console.error('Ошибка очистки сессий:', error);
  }
};
```

## Компонент React для управления ботом

```tsx
import React, { useState, useEffect } from 'react';

interface BotStatus {
  online: boolean;
  status: string;
}

interface BotInfo {
  id: number;
  username: string;
  first_name: string;
}

const TelegramBotManager: React.FC = () => {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Загрузка статуса бота при монтировании
  useEffect(() => {
    loadBotStatus();
    loadBotInfo();
  }, []);

  const loadBotStatus = async () => {
    try {
      const response = await fetch('/api/telegram/status');
      const data = await response.json();
      
      if (data.success) {
        setBotStatus(data.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса:', error);
    }
  };

  const loadBotInfo = async () => {
    try {
      const response = await fetch('/api/telegram/bot-info');
      const data = await response.json();
      
      if (data.success) {
        setBotInfo(data.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о боте:', error);
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookUrl) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Webhook установлен успешно');
        setWebhookUrl('');
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка установки webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/webhook', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Webhook удален успешно');
      } else {
        alert('Ошибка удаления webhook');
      }
    } catch (error) {
      alert('Ошибка удаления webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testChatId || !testMessage) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          chatId: testChatId, 
          message: testMessage 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Сообщение отправлено');
        setTestChatId('');
        setTestMessage('');
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка отправки сообщения');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/cleanup-sessions', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Сессии очищены');
      }
    } catch (error) {
      alert('Ошибка очистки сессий');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="telegram-bot-manager">
      <h2>Управление Telegram ботом</h2>
      
      {/* Статус бота */}
      <div className="bot-status">
        <h3>Статус бота</h3>
        {botStatus && (
          <div>
            <p>
              Статус: 
              <span className={botStatus.online ? 'status-online' : 'status-offline'}>
                {botStatus.status}
              </span>
            </p>
            <button onClick={loadBotStatus}>Обновить статус</button>
          </div>
        )}
      </div>

      {/* Информация о боте */}
      <div className="bot-info">
        <h3>Информация о боте</h3>
        {botInfo && (
          <div>
            <p>ID: {botInfo.id}</p>
            <p>Имя: {botInfo.first_name}</p>
            <p>Username: @{botInfo.username}</p>
          </div>
        )}
      </div>

      {/* Управление webhook */}
      <div className="webhook-management">
        <h3>Управление Webhook</h3>
        <div>
          <input
            type="url"
            placeholder="https://yourdomain.com/api/telegram/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <button 
            onClick={handleSetWebhook} 
            disabled={loading || !webhookUrl}
          >
            Установить Webhook
          </button>
          <button 
            onClick={handleDeleteWebhook} 
            disabled={loading}
          >
            Удалить Webhook
          </button>
        </div>
      </div>

      {/* Тестирование */}
      <div className="testing">
        <h3>Тестирование</h3>
        <div>
          <input
            type="text"
            placeholder="Chat ID"
            value={testChatId}
            onChange={(e) => setTestChatId(e.target.value)}
          />
          <textarea
            placeholder="Сообщение для теста"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
          />
          <button 
            onClick={handleSendTest} 
            disabled={loading || !testChatId || !testMessage}
          >
            Отправить тестовое сообщение
          </button>
        </div>
      </div>

      {/* Управление сессиями */}
      <div className="session-management">
        <h3>Управление сессиями</h3>
        <button onClick={handleCleanupSessions} disabled={loading}>
          Очистить старые сессии
        </button>
      </div>
    </div>
  );
};

export default TelegramBotManager;
```

## CSS стили

```css
.telegram-bot-manager {
  padding: 20px;
  max-width: 800px;
}

.telegram-bot-manager h2 {
  color: #333;
  margin-bottom: 20px;
}

.telegram-bot-manager h3 {
  color: #555;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.bot-status, .bot-info, .webhook-management, .testing, .session-management {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.status-online {
  color: #28a745;
  font-weight: bold;
}

.status-offline {
  color: #dc3545;
  font-weight: bold;
}

.webhook-management input {
  width: 300px;
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.testing input, .testing textarea {
  display: block;
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.testing textarea {
  height: 80px;
  resize: vertical;
}

button {
  padding: 8px 15px;
  margin-right: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
```

## Интеграция в административную панель

Добавьте компонент в маршруты административной панели:

```tsx
// В app-web-billing/src/app/telegram/page.tsx
import TelegramBotManager from '@/components/TelegramBotManager';

export default function TelegramPage() {
  return (
    <div>
      <TelegramBotManager />
    </div>
  );
}
```

## Мониторинг и алерты

### Настройка уведомлений о проблемах

```typescript
// Проверка статуса бота каждые 5 минут
setInterval(async () => {
  try {
    const response = await fetch('/api/telegram/status');
    const data = await response.json();
    
    if (!data.success || !data.data.online) {
      // Отправить уведомление администратору
      console.error('Telegram бот недоступен!');
      // Здесь можно добавить отправку email или SMS администратору
    }
  } catch (error) {
    console.error('Ошибка проверки статуса бота:', error);
  }
}, 5 * 60 * 1000);
```

### Логирование активности

```typescript
// Логирование использования команд
const logBotActivity = (userId: number, command: string) => {
  console.log(`[TELEGRAM BOT] User ${userId} used command: ${command}`);
  
  // Сохранение в базу данных для аналитики
  // await prisma.botActivity.create({
  //   data: { userId, command, timestamp: new Date() }
  // });
};
```

## Безопасность

### Проверка прав доступа

Убедитесь, что все административные endpoints защищены:

```typescript
// Middleware для проверки прав администратора
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Проверка JWT токена и роли пользователя
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    // Проверка роли администратора
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// Применение middleware к маршрутам
app.use('/api/telegram/set-webhook', requireAdmin);
app.use('/api/telegram/send-test', requireAdmin);
// и т.д.
```