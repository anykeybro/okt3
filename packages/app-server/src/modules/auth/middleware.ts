// Временная заглушка для auth middleware
// Будет реализована в следующих задачах
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Временная заглушка - пропускаем все запросы
  next();
};

export const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Временная заглушка - пропускаем все запросы
    next();
  };
};