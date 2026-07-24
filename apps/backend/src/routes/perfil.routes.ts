import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as ctrl from '../controllers/perfil.controller';

const router = Router();
router.use(authMiddleware);

router.get('/',              ctrl.getPerfil);
router.put('/meta',          ctrl.putMeta);
router.put('/senha',         ctrl.putSenha);
router.put('/filial-padrao', ctrl.putFilialPadrao);

export default router;
