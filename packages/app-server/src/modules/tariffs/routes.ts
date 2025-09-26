// Маршруты для модуля тарифов и услуг
import { Router } from 'express';
import { ServicesController } from './services.controller';
import { TariffGroupsController } from './tariff-groups.controller';
import { TariffsController } from './tariffs.controller';
import { authMiddleware, requirePermission } from '../auth/middleware';

const router = Router();

// Инициализируем контроллеры
const servicesController = new ServicesController();
const tariffGroupsController = new TariffGroupsController();
const tariffsController = new TariffsController();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// === МАРШРУТЫ ДЛЯ УСЛУГ ===

// Получение активных услуг (доступно всем авторизованным)
router.get('/services/active', servicesController.getActiveServices);

// Получение всех услуг
router.get('/services', requirePermission('tariffs', 'read'), servicesController.getServices);

// Создание услуги
router.post('/services', requirePermission('tariffs', 'create'), servicesController.createService);

// Получение услуги по ID
router.get('/services/:id', requirePermission('tariffs', 'read'), servicesController.getServiceById);

// Обновление услуги
router.put('/services/:id', requirePermission('tariffs', 'update'), servicesController.updateService);

// Удаление услуги
router.delete('/services/:id', requirePermission('tariffs', 'delete'), servicesController.deleteService);

// === МАРШРУТЫ ДЛЯ ГРУПП ТАРИФОВ ===

// Получение всех групп тарифов (для селектов)
router.get('/groups/all', requirePermission('tariffs', 'read'), tariffGroupsController.getAllTariffGroups);

// Получение всех групп тарифов с пагинацией
router.get('/groups', requirePermission('tariffs', 'read'), tariffGroupsController.getTariffGroups);

// Создание группы тарифов
router.post('/groups', requirePermission('tariffs', 'create'), tariffGroupsController.createTariffGroup);

// Получение группы тарифов по ID
router.get('/groups/:id', requirePermission('tariffs', 'read'), tariffGroupsController.getTariffGroupById);

// Получение группы тарифов с тарифами
router.get('/groups/:id/with-tariffs', requirePermission('tariffs', 'read'), tariffGroupsController.getTariffGroupWithTariffs);

// Получение статистики по группе
router.get('/groups/:id/stats', requirePermission('tariffs', 'read'), tariffGroupsController.getTariffGroupStats);

// Обновление группы тарифов
router.put('/groups/:id', requirePermission('tariffs', 'update'), tariffGroupsController.updateTariffGroup);

// Удаление группы тарифов
router.delete('/groups/:id', requirePermission('tariffs', 'delete'), tariffGroupsController.deleteTariffGroup);

// Перемещение тарифов между группами
router.post('/groups/:fromGroupId/move-tariffs', requirePermission('tariffs', 'update'), tariffGroupsController.moveTariffsToGroup);

// === МАРШРУТЫ ДЛЯ ТАРИФОВ ===

// Получение видимых тарифов для личного кабинета (доступно всем авторизованным)
router.get('/visible', tariffsController.getVisibleTariffs);

// Получение всех тарифов
router.get('/', requirePermission('tariffs', 'read'), tariffsController.getTariffs);

// Создание тарифа
router.post('/', requirePermission('tariffs', 'create'), tariffsController.createTariff);

// Получение тарифа по ID
router.get('/:id', requirePermission('tariffs', 'read'), tariffsController.getTariffById);

// Получение статистики по тарифу
router.get('/:id/stats', requirePermission('tariffs', 'read'), tariffsController.getTariffStats);

// Копирование тарифа
router.post('/:id/copy', requirePermission('tariffs', 'create'), tariffsController.copyTariff);

// Обновление тарифа
router.put('/:id', requirePermission('tariffs', 'update'), tariffsController.updateTariff);

// Удаление тарифа
router.delete('/:id', requirePermission('tariffs', 'delete'), tariffsController.deleteTariff);

export { router as tariffRoutes };