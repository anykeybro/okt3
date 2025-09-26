// Скрипт инициализации MongoDB реплики
// Запускается автоматически в контейнере mongodb-setup

print('🔄 Инициализация MongoDB реплики...');

// Ждем, пока все узлы будут готовы
sleep(5000);

try {
  // Инициализируем реплику
  var config = {
    _id: "rs0",
    members: [
      { _id: 0, host: "mongodb-primary:27017", priority: 2 },
      { _id: 1, host: "mongodb-secondary:27017", priority: 1 },
      { _id: 2, host: "mongodb-arbiter:27017", arbiterOnly: true }
    ]
  };

  print('📝 Конфигурация реплики:');
  printjson(config);

  var result = rs.initiate(config);
  print('✅ Результат инициализации:');
  printjson(result);

  // Ждем завершения инициализации
  print('⏳ Ожидание завершения инициализации...');
  sleep(10000);

  // Проверяем статус
  var status = rs.status();
  print('📊 Статус реплики:');
  printjson(status);

  // Создаем пользователя для приложения (если нужно)
  print('👤 Создание пользователя приложения...');
  
  db = db.getSiblingDB('app_database');
  
  try {
    db.createUser({
      user: "app_user",
      pwd: "app_password",
      roles: [
        { role: "readWrite", db: "app_database" }
      ]
    });
    print('✅ Пользователь app_user создан');
  } catch (e) {
    if (e.code === 51003) {
      print('ℹ️ Пользователь app_user уже существует');
    } else {
      print('❌ Ошибка создания пользователя:', e);
    }
  }

  print('🎉 Инициализация MongoDB реплики завершена успешно!');

} catch (error) {
  print('❌ Ошибка инициализации реплики:', error);
  quit(1);
}