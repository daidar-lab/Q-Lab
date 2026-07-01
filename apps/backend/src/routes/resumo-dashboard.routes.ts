// apps/backend/src/routes/resumo-dashboard.routes.ts

import { Router } from 'express';
import { getResumo } from '../controllers/resumo-dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();
const cache = cacheMiddleware();

router.use(authMiddleware);
router.get('/', cache, getResumo);

export default router;
