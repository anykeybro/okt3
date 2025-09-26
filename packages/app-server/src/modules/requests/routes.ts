// Маршруты для модуля заявок (CRM)
import { Router } from 'express';
import { RequestsController } from './requests.controller';

const router = Router();
const requestsController = new RequestsController();

// Основные CRUD операции
router.post('/', requestsController.createRequest);
router.get('/', requestsController.getRequests);
router.get('/search', requestsController.searchRequests);
router.get('/stats', requestsController.getRequestStats);
router.get('/active', requestsController.getActiveRequests);
router.get('/:id', requestsController.getRequestById);
router.put('/:id', requestsController.updateRequest);
router.delete('/:id', requestsController.deleteRequest);

// Операции с заявками
router.post('/:id/assign', requestsController.assignRequest);
router.post('/:id/status', requestsController.changeRequestStatus);
router.post('/:id/create-client', requestsController.createClientFromRequest);

// Получение заявок по связанным сущностям
router.get('/client/:clientId', requestsController.getRequestsByClient);
router.get('/phone/:phone', requestsController.getRequestsByPhone);
router.get('/user/:userId/assigned', requestsController.getRequestsByAssignedUser);

export { router as requestRoutes };