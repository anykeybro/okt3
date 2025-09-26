// Маршруты для модуля управления абонентами
import { Router } from 'express';
import { ClientsController } from './clients.controller';
import { AccountsController } from './accounts.controller';

const router = Router();
const clientsController = new ClientsController();
const accountsController = new AccountsController();

// Маршруты для абонентов
router.post('/clients', clientsController.createClient);
router.get('/clients', clientsController.getClients);
router.get('/clients/search', clientsController.searchClients);
router.get('/clients/phone/:phone', clientsController.getClientByPhone);
router.get('/clients/email/:email', clientsController.getClientByEmail);
router.get('/clients/radius', clientsController.getClientsInRadius);
router.get('/clients/:id', clientsController.getClientById);
router.put('/clients/:id', clientsController.updateClient);
router.delete('/clients/:id', clientsController.deleteClient);
router.get('/clients/:id/stats', clientsController.getClientStats);
router.post('/clients/:id/geocode', clientsController.geocodeClientAddress);

// Маршруты для лицевых счетов
router.post('/accounts', accountsController.createAccount);
router.get('/accounts', accountsController.getAccounts);
router.get('/accounts/stats', accountsController.getAccountsStats);
router.get('/accounts/low-balance', accountsController.getLowBalanceAccounts);
router.get('/accounts/number/:accountNumber', accountsController.getAccountByNumber);
router.get('/accounts/:id', accountsController.getAccountById);
router.put('/accounts/:id', accountsController.updateAccount);
router.delete('/accounts/:id', accountsController.deleteAccount);

// Операции с лицевыми счетами
router.post('/accounts/:id/block', accountsController.blockAccount);
router.post('/accounts/:id/unblock', accountsController.unblockAccount);
router.post('/accounts/:id/suspend', accountsController.suspendAccount);
router.post('/accounts/:id/resume', accountsController.resumeAccount);
router.post('/accounts/:id/balance', accountsController.changeBalance);

// Лицевые счета клиента
router.get('/clients/:clientId/accounts', accountsController.getClientAccounts);

export default router;