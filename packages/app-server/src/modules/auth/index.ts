// Временная заглушка для auth модуля
// Будет реализована в следующих задачах
import { Router } from 'express';

const router = Router();

// Временная заглушка
router.get('/', (req, res) => {
  res.json({ message: 'Auth module - coming soon' });
});

export { router as authRoutes };
export * from './middleware';