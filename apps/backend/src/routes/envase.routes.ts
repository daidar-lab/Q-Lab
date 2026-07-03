import { Router } from 'express';
import { EnvaseController } from '../controllers/envase.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Rotas legadas
router.post('/produto-acabado', EnvaseController.getProdutoAcabado);
router.post('/chopp', EnvaseController.getChopp);
router.post('/arrolhamento', EnvaseController.getArrolhamento);
router.post('/assoprador', EnvaseController.getAssoprador);
router.post('/lubrificante', EnvaseController.getLubrificante);
router.post('/recravacao', EnvaseController.getRecravacao);
router.post('/pasteurizador', EnvaseController.getPasteurizador);
router.post('/interunidades', EnvaseController.getProdutoInterunidades);

// Grupo A — Sub-telas Módulo Envase (DW_FAT_RESULTADO direto, sem âncora)
router.post('/envase/provas-horarias',    EnvaseController.getProvasHorarias);
router.post('/envase/recravacao',         EnvaseController.getAnalisesRecravacao);
router.post('/envase/pasteurizacao',      EnvaseController.getAnalisesPasteurizacao);
router.post('/envase/lubrificantes',      EnvaseController.getAnalisesLubrificantes);
router.post('/envase/assoprador',         EnvaseController.getAnalisesAssoprador);

export default router;
// Registrar: app.use('/qlab/envase', envaseRoutes)
