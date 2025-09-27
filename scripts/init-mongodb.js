// Скрипт инициализации MongoDB для разработки
print('🔄 Инициализация MongoDB...');

// Создаем пользователя admin
db = db.getSiblingDB('admin');
db.createUser({
  user: 'admin',
  pwd: 'mongodb_admin_pwd',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' },
    { role: 'clusterAdmin', db: 'admin' }
  ]
});
print('✅ Пользователь admin создан');

// Создаем базу данных приложения и пользователя
db = db.getSiblingDB('app_database');
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    { role: 'readWrite', db: 'app_database' }
  ]
});
print('✅ Пользователь app_user создан');

// Создаем тестовую коллекцию
db.test.insertOne({ message: 'MongoDB инициализирован успешно', timestamp: new Date() });
print('✅ Тестовая коллекция создана');

print('🎉 Инициализация MongoDB завершена успешно!');