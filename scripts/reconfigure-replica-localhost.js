// Скрипт пересоздания MongoDB реплики для localhost
// Для работы с локально запущенным приложением

print('🔄 Пересоздание MongoDB реплики для localhost...');

try {
  // Получаем текущую конфигурацию
  var currentConfig = rs.conf();
  print('📝 Текущая конфигурация:');
  printjson(currentConfig);

  // Создаем новую конфигурацию с localhost хостами
  var newConfig = {
    _id: "rs0",
    version: currentConfig.version + 1,
    members: [
      { _id: 0, host: "localhost:27017", priority: 2 },
      { _id: 1, host: "localhost:27018", priority: 1 },
      { _id: 2, host: "localhost:27019", arbiterOnly: true }
    ]
  };

  print('📝 Новая конфигурация:');
  printjson(newConfig);

  // Применяем новую конфигурацию
  var result = rs.reconfig(newConfig, {force: true});
  print('✅ Результат реконфигурации:');
  printjson(result);

  // Ждем завершения реконфигурации
  print('⏳ Ожидание завершения реконфигурации...');
  sleep(15000);

  // Проверяем статус
  var status = rs.status();
  print('📊 Новый статус реплики:');
  printjson(status);

  print('🎉 Реконфигурация MongoDB реплики завершена успешно!');

} catch (error) {
  print('❌ Ошибка реконфигурации реплики:', error);
  quit(1);
}