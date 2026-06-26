// apps/backend/src/routes/inspecao.routes.ts

import { Router } from 'express';
import { handleInspecao } from '../controllers/inspecao.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/inspecao
// Body: ContextoAnalise (codProduto, codCentroCusto, codEnsaio, dataInicio, dataFim, codBem?, codSkipLote?)
// Retorna: ResultadoInspecao com familia determinada
router.post('/', authMiddleware, handleInspecao);

export default router;