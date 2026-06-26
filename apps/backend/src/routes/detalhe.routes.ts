import { Router } from 'express';
import * as DetalheController from '../controllers/detalhe.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/ensaio/:codEnsaio/centros-custo', DetalheController.getCentrosCustoPorEnsaio);
router.get('/produto/:codProduto/ensaio/:codEnsaio/centros-custo', DetalheController.getCentrosCustoPorProdutoEEnsaio);
router.get('/:tipo/:id', DetalheController.getDetalhe);


export default router;