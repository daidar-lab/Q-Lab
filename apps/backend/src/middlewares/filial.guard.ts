import type { Request, Response, NextFunction } from 'express';

export function filialGuard(req: Request, res: Response, next: NextFunction): void {
  // Aceita filialId tanto em query param (GET) quanto em body (POST)
  const raw = req.query.filialId ?? req.body?.filialId;
  const filialId = raw != null ? parseInt(String(raw), 10) : NaN;

  if (isNaN(filialId)) {
    res.status(400).json({ erro: 'filialId é obrigatório.' });
    return;
  }

  // Valida que o usuário autenticado tem acesso à filial solicitada
  const temAcesso = req.usuario?.filiais?.some(f => f.cod_filial === filialId);
  if (!temAcesso) {
    res.status(403).json({ erro: 'Acesso negado a esta filial.' });
    return;
  }

  req.filialId = filialId;
  next();
}
