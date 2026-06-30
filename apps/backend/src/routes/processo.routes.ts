import { Router } from 'express';
import { ProcessoController } from '../controllers/processo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/fermentacao',          ProcessoController.getFermentacao);
router.post('/filtracao',            ProcessoController.getFiltracao);
router.post('/brassagem',            ProcessoController.getBrassagem);
router.post('/maturacao',            ProcessoController.getMaturacao);
router.post('/desalcoolizacao',      ProcessoController.getDesalcoolizacao);
router.post('/captacao',             ProcessoController.getCaptacao);
router.post('/residuos',             ProcessoController.getResiduos);
router.post('/tratamento-efluentes', ProcessoController.getTratamentoEfluentes);
router.post('/ar-comprimido-co2',    ProcessoController.getArCo2);

export default router;
