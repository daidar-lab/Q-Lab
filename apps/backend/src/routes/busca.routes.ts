// apps/backend/src/routes/busca.routes.ts

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { handleGetCatalogo, handleBuscaResultados, handleBuscaAgregacoes } from '../controllers/busca.controller';

const router = Router();
const cache  = cacheMiddleware();

router.use(authMiddleware);

// Catálogo (produtos + ensaios da filial) — TTL alto no Redis pois dados mudam pouco
router.get('/catalogo',    cache, handleGetCatalogo);

// Resultados de busca paginados
router.get('/resultados',  handleBuscaResultados);

// Agregações de busca (KPIs, gráficos)
router.get('/agregacoes',  handleBuscaAgregacoes);

export default router;
