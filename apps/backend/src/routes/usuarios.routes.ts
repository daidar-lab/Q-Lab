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
import * as svc from '../services/usuarios.service';

const router = Router();

// Todas as rotas exigem JWT + role admin
router.use(authMiddleware, adminMiddleware);

router.get('/', handleListar);
router.get('/:id', handleBuscar);
router.post('/', handleCriar);
router.patch('/:id', handleAtualizar);
router.delete('/:id', handleDesativar);

router.get(
  '/:id/filiais',
  async (req, res) => {
    try {
      const filiais = await svc.listarFiliaisDoUsuario(Number(req.params.id));
      res.json(filiais);
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }
);

router.post(
  '/:id/filiais',
  async (req, res) => {
    try {
      await svc.vincularFilial(
        Number(req.params.id),
        Number(req.body.cod_filial),
        Boolean(req.body.filial_padrao),
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }
);

router.delete(
  '/:id/filiais/:filialId',
  async (req, res) => {
    try {
      await svc.desvincularFilial(
        Number(req.params.id),
        Number(req.params.filialId),
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ erro: e.message });
    }
  }
);

export default router;