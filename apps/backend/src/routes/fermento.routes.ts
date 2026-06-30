import { Router } from 'express';
import { FermentoController } from '../controllers/fermento.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', FermentoController.getFermento);

export default router;
