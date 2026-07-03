// apps/backend/src/routes/analitica.routes.ts
//
// Todos os endpoints recebem POST com o ContextoAnalise no body.
//
// Endpoint principal:
//   POST /api/analitica/rodar  → inspeção + família completa em paralelo
//
// Endpoints individuais (lazy load por visualização):
//   POST /api/analitica/numerico/serie
//   POST /api/analitica/numerico/estatisticas
//   POST /api/analitica/numerico/histograma?bins=10
//   POST /api/analitica/numerico/shewhart
//   POST /api/analitica/faixa/distribuicao
//   POST /api/analitica/faixa/serie
//   POST /api/analitica/categorico/frequencia
//   POST /api/analitica/categorico/serie

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { filialGuard } from '../middlewares/filial.guard';
import {
    handleRotar,
    handleNumericoSerie,
    handleNumericoEstatisticas,
    handleNumericoHistograma,
    handleNumericoShewhart,
    handleFaixaDistribuicao,
    handleFaixaSerie,
    handleCategoricoFrequencia,
    handleCategoricoSerie,
    handleNumericoComparacao,
    handleFaixaComparacao,
    handleCategoricoComparacao,
    handleDetalheAmostra,
    handleAmostrasPorBin,
    handleKpisDashboard,
    handleRankingProcessos,
    handleRankingProdutos,
    handleRankingEnsaios,
} from '../controllers/analitica.controller';

const router = Router();
const cache = cacheMiddleware();

router.use(authMiddleware);

// Principal
router.post('/rodar', filialGuard, handleRotar);

// Numérico
router.post('/numerico/serie', filialGuard, handleNumericoSerie);
router.post('/numerico/estatisticas', filialGuard, handleNumericoEstatisticas);
router.post('/numerico/histograma', filialGuard, handleNumericoHistograma);
router.post('/numerico/shewhart', filialGuard, handleNumericoShewhart);

// Faixa
router.post('/faixa/distribuicao', filialGuard, handleFaixaDistribuicao);
router.post('/faixa/serie', filialGuard, handleFaixaSerie);

// Categórico
router.post('/categorico/frequencia', filialGuard, handleCategoricoFrequencia);
router.post('/categorico/serie', filialGuard, handleCategoricoSerie);

// Comparação
router.post('/numerico/comparacao', filialGuard, handleNumericoComparacao);
router.post('/faixa/comparacao', filialGuard, handleFaixaComparacao);
router.post('/categorico/comparacao', filialGuard, handleCategoricoComparacao);

// Detalhe de amostra
router.get('/amostra/:codAmostra', cache, handleDetalheAmostra);
router.post('/amostra/por-bin', filialGuard, handleAmostrasPorBin);

router.get('/dashboard/kpis',               cache, filialGuard, handleKpisDashboard);
router.get('/dashboard/ranking/processos',  cache, filialGuard, handleRankingProcessos);
router.get('/dashboard/ranking/produtos',   cache, filialGuard, handleRankingProdutos);
router.get('/dashboard/ranking/ensaios',    cache, filialGuard, handleRankingEnsaios);

export default router;