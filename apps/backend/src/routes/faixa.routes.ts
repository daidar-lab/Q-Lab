import { Router } from 'express';
import {
    handleGetFaixas,
    handleGetProdutosPorFaixa,
    handleGetHistoricoProdutosFaixa,
    handleGetProdutosSemFaixa,
    handleGetHistoricoProdutosSemFaixa,
} from '../controllers/faixa.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();
const cache = cacheMiddleware();

import { filialGuard } from '../middlewares/filial.guard';

// Require auth for all routes
router.use(authMiddleware);

// Apply filialGuard to all routes that require filialId
router.use(filialGuard);

// GET /api/analitica/detalhe/faixas
router.get('/faixas',                       cache, handleGetFaixas);

// GET /api/analitica/detalhe/faixas/produtos
router.get('/faixas/produtos',              cache, handleGetProdutosPorFaixa);

// GET /api/analitica/detalhe/faixas/produtos/historico
router.get('/faixas/produtos/historico',    cache, handleGetHistoricoProdutosFaixa);

// Fallback: ensaios sem faixa LIE/LSE (processo ou produto sem especificação numérica)
// GET /api/analitica/detalhe/faixas/sem-faixa/produtos
router.get('/faixas/sem-faixa/produtos',    cache, handleGetProdutosSemFaixa);

// GET /api/analitica/detalhe/faixas/sem-faixa/historico
router.get('/faixas/sem-faixa/historico',   cache, handleGetHistoricoProdutosSemFaixa);

export default router;
