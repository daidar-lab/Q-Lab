// apps/backend/src/routes/filiais.routes.ts

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { handleGetFiliais } from '../controllers/filiais.controller';

const router = Router();

// GET /api/filiais
// Cache de longa duração gerenciado dentro do service (Redis 10h).
// O cacheMiddleware aqui funciona como segunda camada (URL-based, 5min padrão).
router.get('/', authMiddleware, cacheMiddleware(), handleGetFiliais);

export default router;
