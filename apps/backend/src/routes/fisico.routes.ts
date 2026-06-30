import { Router } from 'express';
import { FisicoController } from '../controllers/fisico.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/embalagem',     FisicoController.getEmbalagem);
router.post('/materia-prima', FisicoController.getMateriaPrima);
router.post('/quimicos',      FisicoController.getQuimicos);

export default router;
