import { Router } from 'express';
import { EnvaseController } from '../controllers/envase.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/produto-acabado', EnvaseController.getProdutoAcabado);
router.post('/chopp', EnvaseController.getChopp);
router.post('/arrolhamento', EnvaseController.getArrolhamento);
router.post('/assoprador', EnvaseController.getAssoprador);
router.post('/lubrificante', EnvaseController.getLubrificante);
router.post('/recravacao', EnvaseController.getRecravacao);
router.post('/pasteurizador', EnvaseController.getPasteurizador);
router.post('/interunidades', EnvaseController.getProdutoInterunidades);

export default router;
// Registrar: app.use('/qlab/envase', envaseRoutes)
