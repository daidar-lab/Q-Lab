// apps/backend/src/routes/opcoes.routes.ts
//
// Todos os endpoints são GET com querystring.
// Período (dataInicio + dataFim) obrigatório em todos.
// Demais parâmetros opcionais — quanto mais preenchidos, mais restrita a lista.
//
// Drill-down sequencial:
//   GET /api/opcoes/produtos
//   GET /api/opcoes/centros?codProduto=7
//   GET /api/opcoes/bens?codProduto=7&codCentroCusto=410.01
//   GET /api/opcoes/skip-lotes?codProduto=7&codCentroCusto=410.01
//   GET /api/opcoes/ensaios?codProduto=7&codCentroCusto=410.01
//
// Entrada direta (qualquer ordem):
//   GET /api/opcoes/buscar/ensaios?termo=pH&dataInicio=...&dataFim=...
//   GET /api/opcoes/buscar/produtos?termo=Pilsen&dataInicio=...&dataFim=...
//   GET /api/opcoes/produtos?codEnsaio=42&dataInicio=...&dataFim=...

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
    handleGetProdutos,
    handleGetCentros,
    handleGetBens,
    handleGetSkipLotes,
    handleGetEnsaios,
    handleBuscarEnsaios,
    handleBuscarProdutos,
} from '../controllers/opcoes.controller';

const router = Router();

// Todas as rotas protegidas por JWT
router.use(authMiddleware);

// ── Drill-down ───────────────────────────────────────────────────────────────
router.get('/produtos', handleGetProdutos);
router.get('/centros', handleGetCentros);
router.get('/bens', handleGetBens);
router.get('/skip-lotes', handleGetSkipLotes);
router.get('/ensaios', handleGetEnsaios);

// ── Entrada direta (busca LIKE) ───────────────────────────────────────────────
router.get('/buscar/ensaios', handleBuscarEnsaios);
router.get('/buscar/produtos', handleBuscarProdutos);

export default router;