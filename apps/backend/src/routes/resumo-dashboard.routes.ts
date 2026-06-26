// apps/backend/src/routes/resumo-dashboard.routes.ts

import { Router } from 'express';
import { getResumo } from '../controllers/resumo-dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getResumo);

export default router;
