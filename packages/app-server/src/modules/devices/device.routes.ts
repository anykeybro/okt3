// Маршруты для модуля управления устройствами

import { Router } from 'express';
import { DeviceController } from './device.controller';

export function createDeviceRoutes(deviceController: DeviceController): Router {
  const router = Router();

  // TODO: Добавить middleware аутентификации и авторизации после реализации auth модуля

  // GET /api/devices - Получение списка устройств
  router.get('/', deviceController.getDevices);

  // POST /api/devices - Создание нового устройства
  router.post('/', deviceController.createDevice);

  // GET /api/devices/check-all - Проверка всех устройств
  router.get('/check-all', deviceController.checkAllDevices);

  // POST /api/devices/test-connection - Тестирование подключения
  router.post('/test-connection', deviceController.testConnection);

  // GET /api/devices/:id - Получение устройства по ID
  router.get('/:id', deviceController.getDevice);

  // PUT /api/devices/:id - Обновление устройства
  router.put('/:id', deviceController.updateDevice);

  // DELETE /api/devices/:id - Удаление устройства
  router.delete('/:id', deviceController.deleteDevice);

  // GET /api/devices/:id/health - Проверка состояния устройства
  router.get('/:id/health', deviceController.checkDeviceHealth);

  // POST /api/devices/commands - Отправка команды на устройство
  router.post('/commands', deviceController.sendCommand);

  // GET /api/devices/commands/active - Получение активных команд
  router.get('/commands/active', deviceController.getActiveCommands);

  // GET /api/devices/commands/stats - Статистика команд
  router.get('/commands/stats', deviceController.getCommandStats);

  // GET /api/devices/commands/:commandId - Статус команды
  router.get('/commands/:commandId', deviceController.getCommandStatus);

  return router;
}