// apps/backend/src/routes/macroProcesso.routes.ts

import { Router } from 'express';
import * as MacroProcessoController from '../controllers/macroProcesso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();
const cache = cacheMiddleware();
router.use(authMiddleware);

router.get('/',                     cache, MacroProcessoController.getLista);
router.get('/:origem/:natureza',    cache, MacroProcessoController.getDetalhe);

export default router;
