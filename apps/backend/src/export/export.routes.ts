import { Router } from 'express';
import { exportDashboard, exportDetalhe, exportFaixa } from './export.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/dashboard', authMiddleware, exportDashboard);
router.post('/detalhe',   authMiddleware, exportDetalhe);
router.post('/faixa',     authMiddleware, exportFaixa);

export default router;
