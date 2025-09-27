// Скрипт для тестирования Kafka интеграции MikroTik

import { PrismaClient } from '@prisma/client';
import KafkaService from '../kafka';
import { MikroTikKafkaConsumer } from '../modules/devices/kafka.consumer';
import { MikroTikCommand } from '../modules/devices/device.types';
import { config } from '../config/config';

async function testKafkaIntegration() {
  console.log('🧪 Запуск тестирования Kafka интеграции MikroTik...');

  const prisma = new PrismaClient();
  const kafkaService = new KafkaService();
  const consumer = new MikroTikKafkaConsumer(prisma, kafkaService);

  try {
    // Проверяем подключение к Kafka
    console.log('📡 Проверка подключения к Kafka...');
    const isKafkaAvailable = await kafkaService.testConnection();
    
    if (!isKafkaAvailable) {
      console.log('❌ Kafka недоступен. Убедитесь, что Kafka запущен.');
      return;
    }

    console.log('✅ Kafka доступен');

    // Подключаем producer и consumer
    console.log('🔌 Подключение к Kafka...');
    await kafkaService.connectProducer();
    await consumer.start();

    console.log('✅ Подключение к Kafka успешно');

    // Создаем тестовое устройство в базе данных
    console.log('🏗️ Создание тестовых данных...');
    
    const testDevice = await prisma.device.upsert({
      where: { ipAddress: '192.168.1.100' },
      update: {},
      create: {
        ipAddress: '192.168.1.100',
        username: 'admin',
        passwordHash: 'test_hash',
        description: 'Тестовое устройство для Kafka интеграции',
        status: 'ONLINE'
      }
    });

    // Сначала найдем клиента
    let testClient = await prisma.client.findFirst({
      where: { phones: { has: '+79991234567' } },
    });

    if (!testClient) {
      testClient = await prisma.client.create({
        data: {
          firstName: 'Тест',
          lastName: 'Тестов',
          phones: ['+79991234567'],
          email: 'test@example.com'
        }
      });
    }

    const testAccount = await prisma.account.upsert({
      where: { accountNumber: 'TEST001' },
      update: {},
      create: {
        accountNumber: 'TEST001',
        clientId: testClient.id,
        tariffId: 'default-tariff', // Предполагаем, что есть дефолтный тариф
        balance: 100,
        status: 'ACTIVE',
        poolName: 'test-pool',
        blockThreshold: 0,
        deviceId: testDevice.id
      }
    });

    console.log('✅ Тестовые данные созданы');

    // Отправляем тестовые команды
    console.log('📤 Отправка тестовых команд...');

    const commands: MikroTikCommand[] = [
      {
        type: 'ADD_DHCP',
        deviceId: testDevice.id,
        accountId: testAccount.id,
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.200',
        poolName: 'test-pool',
        timestamp: Date.now()
      },
      {
        type: 'BLOCK_CLIENT',
        deviceId: testDevice.id,
        accountId: testAccount.id,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      },
      {
        type: 'UNBLOCK_CLIENT',
        deviceId: testDevice.id,
        accountId: testAccount.id,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      },
      {
        type: 'GET_STATS',
        deviceId: testDevice.id,
        accountId: testAccount.id,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      }
    ];

    for (const command of commands) {
      console.log(`📨 Отправка команды: ${command.type}`);
      await kafkaService.sendMessage(config.kafka.topics.mikrotikCommands, command);
      
      // Небольшая задержка между командами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Все команды отправлены');

    // Ждем обработки команд
    console.log('⏳ Ожидание обработки команд (10 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Проверяем статистику команд
    const commandMonitor = consumer.getCommandMonitor();
    const stats = commandMonitor.getCommandStats();
    const activeCommands = commandMonitor.getActiveCommands();

    console.log('📊 Статистика команд:', stats);
    console.log('📋 Активные команды:', activeCommands.length);

    console.log('✅ Тестирование Kafka интеграции завершено успешно');

  } catch (error) {
    console.error('❌ Ошибка при тестировании Kafka интеграции:', error);
  } finally {
    // Очистка
    console.log('🧹 Очистка ресурсов...');
    
    try {
      await consumer.stop();
      await kafkaService.disconnect();
      await prisma.$disconnect();
      console.log('✅ Ресурсы очищены');
    } catch (error) {
      console.error('❌ Ошибка при очистке ресурсов:', error);
    }
  }
}

// Запуск тестирования
if (require.main === module) {
  testKafkaIntegration()
    .then(() => {
      console.log('🎉 Тестирование завершено');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

export { testKafkaIntegration };