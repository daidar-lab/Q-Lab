// apps/backend/src/routes/usuarios.routes.ts

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import {
    handleListar,
    handleBuscar,
    handleCriar,
    handleAtualizar,
    handleDesativar,
} from '../controllers/usuarios.controller';

const router = Router();

// Todas as rotas exigem JWT + role admin
router.use(authMiddleware, adminMiddleware);

router.get('/', handleListar);
router.get('/:id', handleBuscar);
router.post('/', handleCriar);
router.patch('/:id', handleAtualizar);
router.delete('/:id', handleDesativar);

export default router;