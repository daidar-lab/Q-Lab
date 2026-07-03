import { Router } from 'express';
import { CipController } from '../controllers/cip.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/envasamento', CipController.getCipEnvasamento);
router.post('/processo',    CipController.getCipProcesso);
router.post('/envasamento-antigo', CipController.getCipEnvasamentoAntigo);

export default router;
// Registrar: app.use('/qlab/cip', cipRoutes)
