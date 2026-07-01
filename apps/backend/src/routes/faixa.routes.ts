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

// Require auth for all routes
router.use(authMiddleware);

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
