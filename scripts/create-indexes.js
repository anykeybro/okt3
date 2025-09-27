// Скрипт для создания индексов MongoDB для оптимизации производительности
// Запуск: mongosh --file scripts/create-indexes.js

// Подключение к базе данных
use('billing');

print('Создание индексов для оптимизации производительности...');

// Индексы для коллекции SystemUser
db.SystemUser.createIndex({ username: 1 }, { unique: true, name: 'idx_systemuser_username' });
db.SystemUser.createIndex({ isActive: 1 }, { name: 'idx_systemuser_isactive' });

// Индексы для коллекции Client
db.Client.createIndex({ phones: 1 }, { name: 'idx_client_phones' });
db.Client.createIndex({ email: 1 }, { sparse: true, name: 'idx_client_email' });
db.Client.createIndex({ telegramId: 1 }, { sparse: true, name: 'idx_client_telegramid' });
db.Client.createIndex({ createdAt: -1 }, { name: 'idx_client_createdat' });

// Индексы для коллекции Account
db.Account.createIndex({ accountNumber: 1 }, { unique: true, name: 'idx_account_number' });
db.Account.createIndex({ clientId: 1 }, { name: 'idx_account_clientid' });
db.Account.createIndex({ status: 1 }, { name: 'idx_account_status' });
db.Account.createIndex({ balance: 1 }, { name: 'idx_account_balance' });
db.Account.createIndex({ macAddress: 1 }, { sparse: true, name: 'idx_account_macaddress' });
db.Account.createIndex({ tariffId: 1 }, { name: 'idx_account_tariffid' });

// Составной индекс для поиска активных счетов с низким балансом
db.Account.createIndex({ status: 1, balance: 1 }, { name: 'idx_account_status_balance' });

// Индексы для коллекции Tariff
db.Tariff.createIndex({ isActive: 1 }, { name: 'idx_tariff_isactive' });
db.Tariff.createIndex({ groupId: 1 }, { sparse: true, name: 'idx_tariff_groupid' });
db.Tariff.createIndex({ billingType: 1 }, { name: 'idx_tariff_billingtype' });

// Индексы для коллекции Device
db.Device.createIndex({ ipAddress: 1 }, { unique: true, name: 'idx_device_ipaddress' });
db.Device.createIndex({ status: 1 }, { name: 'idx_device_status' });
db.Device.createIndex({ lastCheck: -1 }, { name: 'idx_device_lastcheck' });

// Индексы для коллекции Request
db.Request.createIndex({ status: 1 }, { name: 'idx_request_status' });
db.Request.createIndex({ clientId: 1 }, { sparse: true, name: 'idx_request_clientid' });
db.Request.createIndex({ phone: 1 }, { name: 'idx_request_phone' });
db.Request.createIndex({ createdAt: -1 }, { name: 'idx_request_createdat' });
db.Request.createIndex({ assignedTo: 1 }, { sparse: true, name: 'idx_request_assignedto' });

// Составной индекс для фильтрации заявок
db.Request.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_request_status_createdat' });

// Индексы для коллекции Payment
db.Payment.createIndex({ accountId: 1 }, { name: 'idx_payment_accountid' });
db.Payment.createIndex({ status: 1 }, { name: 'idx_payment_status' });
db.Payment.createIndex({ source: 1 }, { name: 'idx_payment_source' });
db.Payment.createIndex({ externalId: 1 }, { sparse: true, name: 'idx_payment_externalid' });
db.Payment.createIndex({ createdAt: -1 }, { name: 'idx_payment_createdat' });
db.Payment.createIndex({ processedAt: -1 }, { sparse: true, name: 'idx_payment_processedat' });

// Составной индекс для отчетов по платежам
db.Payment.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_payment_status_createdat' });
db.Payment.createIndex({ accountId: 1, createdAt: -1 }, { name: 'idx_payment_account_createdat' });

// Индексы для коллекции Notification
db.Notification.createIndex({ clientId: 1 }, { name: 'idx_notification_clientid' });
db.Notification.createIndex({ status: 1 }, { name: 'idx_notification_status' });
db.Notification.createIndex({ type: 1 }, { name: 'idx_notification_type' });
db.Notification.createIndex({ channel: 1 }, { name: 'idx_notification_channel' });
db.Notification.createIndex({ createdAt: -1 }, { name: 'idx_notification_createdat' });
db.Notification.createIndex({ sentAt: -1 }, { sparse: true, name: 'idx_notification_sentat' });

// Составной индекс для поиска неотправленных уведомлений
db.Notification.createIndex({ status: 1, createdAt: 1 }, { name: 'idx_notification_status_createdat' });

// Индексы для коллекции NotificationTemplate
db.NotificationTemplate.createIndex({ type: 1, channel: 1 }, { unique: true, name: 'idx_template_type_channel' });
db.NotificationTemplate.createIndex({ isActive: 1 }, { name: 'idx_template_isactive' });

// Индексы для коллекции AuditLog (будет создана далее)
db.AuditLog.createIndex({ userId: 1 }, { name: 'idx_auditlog_userid' });
db.AuditLog.createIndex({ action: 1 }, { name: 'idx_auditlog_action' });
db.AuditLog.createIndex({ resource: 1 }, { name: 'idx_auditlog_resource' });
db.AuditLog.createIndex({ createdAt: -1 }, { name: 'idx_auditlog_createdat' });

// Составной индекс для поиска по пользователю и дате
db.AuditLog.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_auditlog_user_createdat' });

// TTL индекс для автоматического удаления старых логов (через 1 год)
db.AuditLog.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000, name: 'idx_auditlog_ttl' });

print('Индексы успешно созданы!');

// Показать статистику индексов
print('\nСтатистика индексов:');
const collections = ['SystemUser', 'Client', 'Account', 'Tariff', 'Device', 'Request', 'Payment', 'Notification', 'NotificationTemplate', 'AuditLog'];

collections.forEach(collName => {
    if (db.getCollection(collName).exists()) {
        const indexes = db.getCollection(collName).getIndexes();
        print(`${collName}: ${indexes.length} индексов`);
    }
});