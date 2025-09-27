/**
 * Моки для внешних сервисов
 */

// Мок для Robokassa API
export const mockRobokassaService = {
  generatePaymentUrl: jest.fn(),
  verifySignature: jest.fn(),
  processWebhook: jest.fn(),
  checkPaymentStatus: jest.fn()
};

// Мок для Telegram Bot API
export const mockTelegramService = {
  sendMessage: jest.fn(),
  sendKeyboard: jest.fn(),
  setWebhook: jest.fn(),
  processUpdate: jest.fn(),
  getMe: jest.fn()
};

// Мок для SMS сервиса (Huawei E3372)
export const mockSMSService = {
  sendSMS: jest.fn(),
  getStatus: jest.fn(),
  clearOutbox: jest.fn(),
  getSignalStrength: jest.fn(),
  getBalance: jest.fn()
};

// Мок для Yandex Maps API
export const mockGeocodingService = {
  geocodeAddress: jest.fn(),
  reverseGeocode: jest.fn()
};

// Мок для MikroTik API
export const mockMikroTikService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  addDHCPLease: jest.fn(),
  removeDHCPLease: jest.fn(),
  blockClient: jest.fn(),
  unblockClient: jest.fn(),
  getClientStats: jest.fn(),
  testConnection: jest.fn(),
  getDHCPLeases: jest.fn(),
  getActiveClients: jest.fn()
};

// Мок для Kafka
export const mockKafkaProducer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn()
};

export const mockKafkaConsumer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn()
};

export const mockKafkaAdmin = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  createTopics: jest.fn(),
  listTopics: jest.fn(),
  deleteTopics: jest.fn()
};

// Функция для сброса всех моков
export const resetAllMocks = (): void => {
  Object.values(mockRobokassaService).forEach(mock => mock.mockReset());
  Object.values(mockTelegramService).forEach(mock => mock.mockReset());
  Object.values(mockSMSService).forEach(mock => mock.mockReset());
  Object.values(mockGeocodingService).forEach(mock => mock.mockReset());
  Object.values(mockMikroTikService).forEach(mock => mock.mockReset());
  Object.values(mockKafkaProducer).forEach(mock => mock.mockReset());
  Object.values(mockKafkaConsumer).forEach(mock => mock.mockReset());
  Object.values(mockKafkaAdmin).forEach(mock => mock.mockReset());
};

// Функция для настройки успешных ответов по умолчанию
export const setupDefaultMocks = (): void => {
  // Robokassa
  mockRobokassaService.generatePaymentUrl.mockResolvedValue({
    paymentUrl: 'https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=test&OutSum=1000',
    invoiceId: 'test-invoice-123'
  });
  mockRobokassaService.verifySignature.mockReturnValue(true);
  mockRobokassaService.checkPaymentStatus.mockResolvedValue({
    status: 'SUCCESS',
    amount: 1000
  });

  // Telegram
  mockTelegramService.sendMessage.mockResolvedValue({
    ok: true,
    result: { message_id: 123 }
  });
  mockTelegramService.getMe.mockResolvedValue({
    ok: true,
    result: {
      id: 123456789,
      is_bot: true,
      first_name: 'OK-Telecom Bot',
      username: 'oktelecom_bot'
    }
  });

  // SMS
  mockSMSService.sendSMS.mockResolvedValue({
    messageId: 'sms-123',
    status: 'sent'
  });
  mockSMSService.getStatus.mockResolvedValue({
    messageId: 'sms-123',
    status: 'delivered'
  });

  // Geocoding
  mockGeocodingService.geocodeAddress.mockResolvedValue({
    coordinates: { latitude: 55.7558, longitude: 37.6176 },
    formattedAddress: 'Москва, Россия'
  });

  // MikroTik
  mockMikroTikService.connect.mockResolvedValue(true);
  mockMikroTikService.testConnection.mockResolvedValue({ success: true });
  mockMikroTikService.addDHCPLease.mockResolvedValue({ success: true, ip: '192.168.1.100' });
  mockMikroTikService.removeDHCPLease.mockResolvedValue({ success: true });
  mockMikroTikService.blockClient.mockResolvedValue({ success: true });
  mockMikroTikService.unblockClient.mockResolvedValue({ success: true });

  // Kafka
  mockKafkaProducer.connect.mockResolvedValue(undefined);
  mockKafkaProducer.send.mockResolvedValue([{
    topicName: 'test-topic',
    partition: 0,
    errorCode: 0,
    offset: '123'
  }]);
  
  mockKafkaConsumer.connect.mockResolvedValue(undefined);
  mockKafkaConsumer.subscribe.mockResolvedValue(undefined);
  
  mockKafkaAdmin.connect.mockResolvedValue(undefined);
  mockKafkaAdmin.listTopics.mockResolvedValue(['mikrotik-commands']);
  mockKafkaAdmin.createTopics.mockResolvedValue(true);
};