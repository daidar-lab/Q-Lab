import { Router } from 'express';
import * as DetalheController from '../controllers/detalhe.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();
const cache = cacheMiddleware();

router.use(authMiddleware);

router.get('/ensaio/:codEnsaio/centros-custo',                              cache, DetalheController.getCentrosCustoPorEnsaio);
router.get('/produto/:codProduto/ensaio/:codEnsaio/centros-custo',          cache, DetalheController.getCentrosCustoPorProdutoEEnsaio);
router.get('/:tipo/:id/resumo-ia',                                          DetalheController.getResumoDetalheIAController);
router.get('/:tipo/:id',                                                    cache, DetalheController.getDetalhe);

export default router;