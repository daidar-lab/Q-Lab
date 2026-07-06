import { Router } from 'express';
import * as DetalheController from '../controllers/detalhe.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { filialGuard } from '../middlewares/filial.guard';

const router = Router();
const cache = cacheMiddleware();

router.use(authMiddleware);

router.get('/ensaio/:codEnsaio/centros-custo',                              cache, DetalheController.getCentrosCustoPorEnsaio);
router.get('/produto/:codProduto/ensaio/:codEnsaio/centros-custo',          cache, DetalheController.getCentrosCustoPorProdutoEEnsaio);
router.get('/informativos/ensaios',                                         cache, DetalheController.getListaEnsaiosInformativosController);
router.get('/informativos/centros-custo',                                   cache, DetalheController.getCentrosCustoPorInformativoController);
router.get('/informativos/produtos',                                        cache, DetalheController.getProdutosPorInformativoECentroController);
router.get('/informativos/amostras',                                        cache, DetalheController.getAmostrasPorInformativoECentroEProdutoController);
router.get('/:tipo/:id/resumo-ia',                                          filialGuard, DetalheController.getResumoDetalheIAController);
router.get('/:tipo/:id',                                                    cache, filialGuard, DetalheController.getDetalhe);

export default router;