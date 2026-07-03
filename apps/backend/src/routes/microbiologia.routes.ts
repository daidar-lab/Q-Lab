import { Router } from 'express';
import { MicrobiologiaController } from '../controllers/microbiologia.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/microbiologia/estabilidade-biologica-micro',  MicrobiologiaController.getEstabilidadeBiologicaMicro);   // Body: { data_inicial, data_final }
router.post('/microbiologia/estabilidade-biologica-envase', MicrobiologiaController.getEstabilidadeBiologicaEnvase);  // Body: { data_inicial, data_final }
router.post('/microbiologia/resultados',                    MicrobiologiaController.getResultadosMicrobiologicos);    // Body: { cod_filial, data_inicial, data_final }
router.post('/microbiologia/agua-de-enxague',               MicrobiologiaController.getAguaDeEnxague);               // Body: { data_inicial, data_final }
router.post('/microbiologia/swab',                          MicrobiologiaController.getSwab);                        // Body: { data_inicial, data_final }
router.post('/microbiologia/analise-microbiologia',         MicrobiologiaController.getAnaliseMicrobiologia);        // Body: { data_inicial, data_final }

export default router;
// Registrar: app.use('/qlab', microbiologiaRoutes)
