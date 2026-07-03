// apps/backend/src/routes/auth.routes.ts

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { handleLogin, handleMe } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/login — pública
router.post('/login', handleLogin);

// GET /api/auth/me — protegida — valida token e devolve payload
router.get('/me', authMiddleware, handleMe);

// GET /api/auth/refresh — renova token do usuário logado
import { handleRefresh } from '../controllers/auth.controller';
router.get('/refresh', authMiddleware, handleRefresh);

export default router;