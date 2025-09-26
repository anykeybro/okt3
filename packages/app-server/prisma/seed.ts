// Скрипт для инициализации базы данных начальными данными
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем инициализацию базы данных...');

  // Создаем роли по умолчанию
  console.log('📋 Создаем роли...');
  
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Суперадмин' },
    update: {},
    create: {
      name: 'Суперадмин',
      description: 'Полный доступ ко всем функциям системы',
      permissions: {
        create: [
          { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'clients', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'tariffs', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'devices', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'requests', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'payments', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'billing', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'notifications', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'dashboard', actions: ['read'] },
        ],
      },
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: 'Кассир' },
    update: {},
    create: {
      name: 'Кассир',
      description: 'Доступ к операциям с платежами и клиентами',
      permissions: {
        create: [
          { resource: 'clients', actions: ['read', 'update'] },
          { resource: 'payments', actions: ['create', 'read'] },
          { resource: 'dashboard', actions: ['read'] },
        ],
      },
    },
  });

  const technicianRole = await prisma.role.upsert({
    where: { name: 'Монтажник' },
    update: {},
    create: {
      name: 'Монтажник',
      description: 'Доступ к заявкам и техническим операциям',
      permissions: {
        create: [
          { resource: 'clients', actions: ['create', 'read', 'update'] },
          { resource: 'requests', actions: ['read', 'update'] },
          { resource: 'devices', actions: ['read'] },
          { resource: 'dashboard', actions: ['read'] },
        ],
      },
    },
  });

  // Создаем базовые услуги
  console.log('🌐 Создаем базовые услуги...');
  
  const internetService = await prisma.service.upsert({
    where: { name: 'Интернет' },
    update: {},
    create: {
      name: 'Интернет',
      description: 'Доступ к сети Интернет',
      type: 'INTERNET',
    },
  });

  const iptvService = await prisma.service.upsert({
    where: { name: 'IPTV' },
    update: {},
    create: {
      name: 'IPTV',
      description: 'Интерактивное телевидение',
      type: 'IPTV',
    },
  });

  const cloudService = await prisma.service.upsert({
    where: { name: 'Облачное хранилище' },
    update: {},
    create: {
      name: 'Облачное хранилище',
      description: 'Персональное облачное хранилище',
      type: 'CLOUD_STORAGE',
    },
  });

  // Создаем группу тарифов
  console.log('📦 Создаем группы тарифов...');
  
  const homeGroup = await prisma.tariffGroup.upsert({
    where: { name: 'Домашние тарифы' },
    update: {},
    create: {
      name: 'Домашние тарифы',
      description: 'Тарифы для домашнего использования',
    },
  });

  // Создаем базовые тарифы
  console.log('💰 Создаем базовые тарифы...');
  
  await prisma.tariff.upsert({
    where: { name: 'Базовый' },
    update: {},
    create: {
      name: 'Базовый',
      description: 'Базовый тариф для домашнего интернета',
      price: 500,
      billingType: 'PREPAID_MONTHLY',
      speedDown: 50,
      speedUp: 10,
      serviceIds: [internetService.id],
      groupId: homeGroup.id,
      isVisibleInLK: true,
      notificationDays: 3,
    },
  });

  await prisma.tariff.upsert({
    where: { name: 'Стандарт' },
    update: {},
    create: {
      name: 'Стандарт',
      description: 'Стандартный тариф с IPTV',
      price: 800,
      billingType: 'PREPAID_MONTHLY',
      speedDown: 100,
      speedUp: 20,
      serviceIds: [internetService.id, iptvService.id],
      groupId: homeGroup.id,
      isVisibleInLK: true,
      notificationDays: 3,
    },
  });

  await prisma.tariff.upsert({
    where: { name: 'Премиум' },
    update: {},
    create: {
      name: 'Премиум',
      description: 'Премиум тариф со всеми услугами',
      price: 1200,
      billingType: 'PREPAID_MONTHLY',
      speedDown: 200,
      speedUp: 50,
      serviceIds: [internetService.id, iptvService.id, cloudService.id],
      groupId: homeGroup.id,
      isVisibleInLK: true,
      notificationDays: 5,
    },
  });

  // Создаем шаблоны уведомлений
  console.log('📧 Создаем шаблоны уведомлений...');
  
  const notificationTemplates = [
    {
      type: 'WELCOME',
      channel: 'TELEGRAM',
      template: 'Добро пожаловать в OK-Telecom! Ваш лицевой счет: {{accountNumber}}. Баланс: {{balance}} руб.',
    },
    {
      type: 'WELCOME',
      channel: 'SMS',
      template: 'Добро пожаловать в OK-Telecom! Л/С: {{accountNumber}}, баланс: {{balance}} руб.',
    },
    {
      type: 'PAYMENT',
      channel: 'TELEGRAM',
      template: 'Платеж зачислен! Сумма: {{amount}} руб. Баланс: {{balance}} руб.',
    },
    {
      type: 'PAYMENT',
      channel: 'SMS',
      template: 'Платеж {{amount}} руб. зачислен. Баланс: {{balance}} руб.',
    },
    {
      type: 'LOW_BALANCE',
      channel: 'TELEGRAM',
      template: 'Внимание! Низкий баланс: {{balance}} руб. Пополните счет для продолжения услуг.',
    },
    {
      type: 'LOW_BALANCE',
      channel: 'SMS',
      template: 'Низкий баланс: {{balance}} руб. Пополните счет.',
    },
    {
      type: 'BLOCKED',
      channel: 'TELEGRAM',
      template: 'Услуги заблокированы из-за недостатка средств. Баланс: {{balance}} руб.',
    },
    {
      type: 'BLOCKED',
      channel: 'SMS',
      template: 'Услуги заблокированы. Баланс: {{balance}} руб.',
    },
    {
      type: 'UNBLOCKED',
      channel: 'TELEGRAM',
      template: 'Услуги разблокированы! Баланс: {{balance}} руб.',
    },
    {
      type: 'UNBLOCKED',
      channel: 'SMS',
      template: 'Услуги разблокированы. Баланс: {{balance}} руб.',
    },
  ];

  for (const template of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: {
        type_channel: {
          type: template.type as any,
          channel: template.channel as any,
        },
      },
      update: {},
      create: template as any,
    });
  }

  console.log('✅ Инициализация базы данных завершена!');
  console.log(`📋 Создано ролей: 3`);
  console.log(`🌐 Создано услуг: 3`);
  console.log(`💰 Создано тарифов: 3`);
  console.log(`📧 Создано шаблонов уведомлений: ${notificationTemplates.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка инициализации:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });