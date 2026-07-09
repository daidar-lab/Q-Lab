// apps/backend/src/routes/resumo-dashboard.routes.ts

import { Router } from 'express';
import { getResumo } from '../controllers/resumo-dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

router.use(authMiddleware);
router.post('/', getResumo);

export default router;
