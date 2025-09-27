import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(__dirname, '..', envFile);
dotenv.config({ path: envPath });

async function createIndexes() {
  const databaseUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/billing';
  const client = new MongoClient(databaseUrl);
  
  try {
    await client.connect();
    console.log('Подключение к MongoDB установлено');
    
    const db = client.db();
    
    console.log('Создание индексов для оптимизации производительности...');

    // Индексы для коллекции SystemUser
    await db.collection('system_users').createIndex({ username: 1 }, { unique: true, name: 'idx_systemuser_username' });
    await db.collection('system_users').createIndex({ isActive: 1 }, { name: 'idx_systemuser_isactive' });

    // Индексы для коллекции Client
    await db.collection('clients').createIndex({ phones: 1 }, { name: 'idx_client_phones' });
    await db.collection('clients').createIndex({ email: 1 }, { sparse: true, name: 'idx_client_email' });
    await db.collection('clients').createIndex({ telegramId: 1 }, { sparse: true, name: 'idx_client_telegramid' });
    await db.collection('clients').createIndex({ createdAt: -1 }, { name: 'idx_client_createdat' });

    // Индексы для коллекции Account
    await db.collection('accounts').createIndex({ accountNumber: 1 }, { unique: true, name: 'idx_account_number' });
    await db.collection('accounts').createIndex({ clientId: 1 }, { name: 'idx_account_clientid' });
    await db.collection('accounts').createIndex({ status: 1 }, { name: 'idx_account_status' });
    await db.collection('accounts').createIndex({ balance: 1 }, { name: 'idx_account_balance' });
    await db.collection('accounts').createIndex({ macAddress: 1 }, { sparse: true, name: 'idx_account_macaddress' });
    await db.collection('accounts').createIndex({ tariffId: 1 }, { name: 'idx_account_tariffid' });
    await db.collection('accounts').createIndex({ status: 1, balance: 1 }, { name: 'idx_account_status_balance' });

    // Индексы для коллекции Tariff
    await db.collection('tariffs').createIndex({ isActive: 1 }, { name: 'idx_tariff_isactive' });
    await db.collection('tariffs').createIndex({ groupId: 1 }, { sparse: true, name: 'idx_tariff_groupid' });
    await db.collection('tariffs').createIndex({ billingType: 1 }, { name: 'idx_tariff_billingtype' });

    // Индексы для коллекции Device
    await db.collection('devices').createIndex({ ipAddress: 1 }, { unique: true, name: 'idx_device_ipaddress' });
    await db.collection('devices').createIndex({ status: 1 }, { name: 'idx_device_status' });
    await db.collection('devices').createIndex({ lastCheck: -1 }, { name: 'idx_device_lastcheck' });

    // Индексы для коллекции Request
    await db.collection('requests').createIndex({ status: 1 }, { name: 'idx_request_status' });
    await db.collection('requests').createIndex({ clientId: 1 }, { sparse: true, name: 'idx_request_clientid' });
    await db.collection('requests').createIndex({ phone: 1 }, { name: 'idx_request_phone' });
    await db.collection('requests').createIndex({ createdAt: -1 }, { name: 'idx_request_createdat' });
    await db.collection('requests').createIndex({ assignedToId: 1 }, { sparse: true, name: 'idx_request_assignedto' });
    await db.collection('requests').createIndex({ status: 1, createdAt: -1 }, { name: 'idx_request_status_createdat' });

    // Индексы для коллекции Payment
    await db.collection('payments').createIndex({ accountId: 1 }, { name: 'idx_payment_accountid' });
    await db.collection('payments').createIndex({ status: 1 }, { name: 'idx_payment_status' });
    await db.collection('payments').createIndex({ source: 1 }, { name: 'idx_payment_source' });
    await db.collection('payments').createIndex({ externalId: 1 }, { sparse: true, name: 'idx_payment_externalid' });
    await db.collection('payments').createIndex({ createdAt: -1 }, { name: 'idx_payment_createdat' });
    await db.collection('payments').createIndex({ processedAt: -1 }, { sparse: true, name: 'idx_payment_processedat' });
    await db.collection('payments').createIndex({ status: 1, createdAt: -1 }, { name: 'idx_payment_status_createdat' });
    await db.collection('payments').createIndex({ accountId: 1, createdAt: -1 }, { name: 'idx_payment_account_createdat' });

    // Индексы для коллекции Notification
    await db.collection('notifications').createIndex({ clientId: 1 }, { name: 'idx_notification_clientid' });
    await db.collection('notifications').createIndex({ status: 1 }, { name: 'idx_notification_status' });
    await db.collection('notifications').createIndex({ type: 1 }, { name: 'idx_notification_type' });
    await db.collection('notifications').createIndex({ channel: 1 }, { name: 'idx_notification_channel' });
    await db.collection('notifications').createIndex({ createdAt: -1 }, { name: 'idx_notification_createdat' });
    await db.collection('notifications').createIndex({ sentAt: -1 }, { sparse: true, name: 'idx_notification_sentat' });
    await db.collection('notifications').createIndex({ status: 1, createdAt: 1 }, { name: 'idx_notification_status_createdat' });

    // Индексы для коллекции NotificationTemplate
    await db.collection('notification_templates').createIndex({ type: 1, channel: 1 }, { unique: true, name: 'idx_template_type_channel' });
    await db.collection('notification_templates').createIndex({ isActive: 1 }, { name: 'idx_template_isactive' });

    // Индексы для коллекции AuditLog
    await db.collection('audit_logs').createIndex({ userId: 1 }, { name: 'idx_auditlog_userid' });
    await db.collection('audit_logs').createIndex({ action: 1 }, { name: 'idx_auditlog_action' });
    await db.collection('audit_logs').createIndex({ resource: 1 }, { name: 'idx_auditlog_resource' });
    await db.collection('audit_logs').createIndex({ createdAt: -1 }, { name: 'idx_auditlog_createdat' });
    await db.collection('audit_logs').createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_auditlog_user_createdat' });

    // TTL индекс для автоматического удаления старых логов (через 1 год)
    await db.collection('audit_logs').createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000, name: 'idx_auditlog_ttl' });

    console.log('Индексы успешно созданы!');

    // Показать статистику индексов
    console.log('\nСтатистика индексов:');
    const collections = ['system_users', 'clients', 'accounts', 'tariffs', 'devices', 'requests', 'payments', 'notifications', 'notification_templates', 'audit_logs'];

    for (const collName of collections) {
      try {
        const indexes = await db.collection(collName).indexes();
        console.log(`${collName}: ${indexes.length} индексов`);
      } catch (error) {
        console.log(`${collName}: коллекция не существует`);
      }
    }

  } catch (error) {
    console.error('Ошибка создания индексов:', error);
  } finally {
    await client.close();
    console.log('Соединение с MongoDB закрыто');
  }
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
  createIndexes().catch(console.error);
}

export { createIndexes };