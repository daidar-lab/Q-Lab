// apps/backend/src/routes/macroProcesso.routes.ts

import { Router } from 'express';
import * as MacroProcessoController from '../controllers/macroProcesso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', MacroProcessoController.getLista);
router.get('/:origem/:natureza', MacroProcessoController.getDetalhe);

export default router;
