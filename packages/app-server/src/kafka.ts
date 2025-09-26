import { Kafka, Producer, Consumer, Partitioners, logLevel } from 'kafkajs';

class KafkaService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;

  constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:29092'];
    const clientId = process.env.KAFKA_CLIENT_ID || 'app-server';

    this.kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.WARN, // Уменьшаем количество логов
      retry: {
        initialRetryTime: 300,
        retries: 5,
        maxRetryTime: 30000,
        restartOnFailure: async () => true
      },
      connectionTimeout: 10000,
      requestTimeout: 30000
    });
  }

  async connectProducer(): Promise<void> {
    try {
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner, // Исправляем предупреждение о партиционере
        maxInFlightRequests: 1,
        idempotent: false,
        transactionTimeout: 30000
      });
      await this.producer.connect();
      console.log('✅ Kafka Producer подключен успешно');
    } catch (error) {
      console.error('❌ Ошибка подключения Kafka Producer:', error);
      throw error;
    }
  }

  async connectConsumer(groupId?: string): Promise<void> {
    try {
      const consumerGroupId = groupId || process.env.KAFKA_GROUP_ID || 'app-server-group';
      this.consumer = this.kafka.consumer({ 
        groupId: consumerGroupId,
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576,
        minBytes: 1,
        maxBytes: 10485760,
        maxWaitTimeInMs: 5000,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });
      
      // Добавляем обработчики событий для лучшей диагностики
      this.consumer.on('consumer.connect', () => {
        console.log('🔗 Kafka Consumer подключился');
      });
      
      this.consumer.on('consumer.disconnect', () => {
        console.log('🔌 Kafka Consumer отключился');
      });
      
      this.consumer.on('consumer.group_join', (event) => {
        console.log('👥 Consumer присоединился к группе:', event.payload.groupId);
      });

      await this.consumer.connect();
      console.log('✅ Kafka Consumer подключен успешно');
    } catch (error) {
      console.error('❌ Ошибка подключения Kafka Consumer:', error);
      throw error;
    }
  }

  async sendMessage(topic: string, message: any): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer не подключен');
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      });
      console.log(`📤 Сообщение отправлено в топик ${topic}:`, message);
    } catch (error) {
      console.error(`❌ Ошибка отправки сообщения в топик ${topic}:`, error);
      throw error;
    }
  }

  async subscribeToTopic(topic: string, callback: (message: any) => void): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer не подключен');
    }

    try {
      await this.consumer.subscribe({ 
        topic, 
        fromBeginning: false // Изменяем на false, чтобы читать только новые сообщения
      });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          try {
            // Периодически отправляем heartbeat для поддержания соединения
            await heartbeat();
            
            const messageValue = message.value?.toString();
            if (messageValue) {
              const parsedMessage = JSON.parse(messageValue);
              console.log(`📥 Получено сообщение из топика ${topic} (partition ${partition}):`, parsedMessage);
              callback(parsedMessage);
            }
          } catch (error) {
            console.error(`❌ Ошибка обработки сообщения из топика ${topic}:`, error);
          }
        },
      });
      
      console.log(`🔔 Подписка на топик ${topic} активна`);
    } catch (error) {
      console.error(`❌ Ошибка подписки на топик ${topic}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        console.log('🔌 Kafka Producer отключен');
      }
      if (this.consumer) {
        await this.consumer.disconnect();
        console.log('🔌 Kafka Consumer отключен');
      }
    } catch (error) {
      console.error('❌ Ошибка отключения от Kafka:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      // Создаем топик app-events если его нет
      const topics = await admin.listTopics();
      console.log('📋 Доступные топики Kafka:', topics);
      
      if (!topics.includes('app-events')) {
        await admin.createTopics({
          topics: [{
            topic: 'app-events',
            numPartitions: 1,
            replicationFactor: 1
          }]
        });
        console.log('📝 Создан топик app-events');
      }
      
      await admin.disconnect();
      console.log('✅ Тестовое подключение к Kafka успешно!');
      return true;
    } catch (error) {
      console.error('❌ Ошибка тестового подключения к Kafka:', error);
      return false;
    }
  }
}

export default KafkaService;