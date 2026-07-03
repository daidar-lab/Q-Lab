import { Router } from 'express';
import { MicrobiologiaController } from '../controllers/microbiologia.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { filialGuard } from '../middlewares/filial.guard';

const router = Router();

router.use(authMiddleware);

router.post('/microbiologia/estabilidade-biologica-micro',  filialGuard, MicrobiologiaController.getEstabilidadeBiologicaMicro);
router.post('/microbiologia/estabilidade-biologica-envase', filialGuard, MicrobiologiaController.getEstabilidadeBiologicaEnvase);
router.post('/microbiologia/resultados',                    MicrobiologiaController.getResultadosMicrobiologicos);    // Body: { cod_filial, data_inicial, data_final }
router.post('/microbiologia/agua-de-enxague',               filialGuard, MicrobiologiaController.getAguaDeEnxague);
router.post('/microbiologia/swab',                          filialGuard, MicrobiologiaController.getSwab);
router.post('/microbiologia/analise-microbiologia',         filialGuard, MicrobiologiaController.getAnaliseMicrobiologia);

export default router;
// Registrar: app.use('/qlab', microbiologiaRoutes)
