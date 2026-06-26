import { Router } from 'express';
import {
    handleGetFaixas,
    handleGetProdutosPorFaixa,
    handleGetHistoricoProdutosFaixa,
    handleGetProdutosSemFaixa,
    handleGetHistoricoProdutosSemFaixa,
} from '../controllers/faixa.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Require auth for all routes
router.use(authMiddleware);

// GET /api/analitica/detalhe/faixas
router.get('/faixas', handleGetFaixas);

// GET /api/analitica/detalhe/faixas/produtos
router.get('/faixas/produtos', handleGetProdutosPorFaixa);

// GET /api/analitica/detalhe/faixas/produtos/historico
router.get('/faixas/produtos/historico', handleGetHistoricoProdutosFaixa);

// Fallback: ensaios sem faixa LIE/LSE (processo ou produto sem especificação numérica)
// GET /api/analitica/detalhe/faixas/sem-faixa/produtos
router.get('/faixas/sem-faixa/produtos', handleGetProdutosSemFaixa);

// GET /api/analitica/detalhe/faixas/sem-faixa/historico
router.get('/faixas/sem-faixa/historico', handleGetHistoricoProdutosSemFaixa);

export default router;
