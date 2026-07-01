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
router.post('/rodar', handleRotar);

// Numérico
router.post('/numerico/serie', handleNumericoSerie);
router.post('/numerico/estatisticas', handleNumericoEstatisticas);
router.post('/numerico/histograma', handleNumericoHistograma);
router.post('/numerico/shewhart', handleNumericoShewhart);

// Faixa
router.post('/faixa/distribuicao', handleFaixaDistribuicao);
router.post('/faixa/serie', handleFaixaSerie);

// Categórico
router.post('/categorico/frequencia', handleCategoricoFrequencia);
router.post('/categorico/serie', handleCategoricoSerie);

// Comparação
router.post('/numerico/comparacao', handleNumericoComparacao);
router.post('/faixa/comparacao', handleFaixaComparacao);
router.post('/categorico/comparacao', handleCategoricoComparacao);

// Detalhe de amostra
router.get('/amostra/:codAmostra', cache, handleDetalheAmostra);
router.post('/amostra/por-bin', handleAmostrasPorBin);

router.get('/dashboard/kpis',               cache, handleKpisDashboard);
router.get('/dashboard/ranking/processos',  cache, handleRankingProcessos);
router.get('/dashboard/ranking/produtos',   cache, handleRankingProdutos);
router.get('/dashboard/ranking/ensaios',    cache, handleRankingEnsaios);

export default router;