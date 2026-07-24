import type { Request, Response } from 'express';
import * as svc from '../services/perfil.service';

export async function getPerfil(req: Request, res: Response) {
  try {
    res.json(await svc.getMeuPerfil(req.usuario!.sub));
  } catch (e: any) {
    res.status(500).json({ erro: e.message });
  }
}

export async function putMeta(req: Request, res: Response) {
  const meta = parseFloat(req.body.meta_conformidade);
  if (isNaN(meta)) {
      res.status(400).json({ erro: 'meta_conformidade inválida.' });
      return;
  }
  try {
    await svc.atualizarMeta(req.usuario!.sub, meta);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ erro: e.message });
  }
}

export async function putSenha(req: Request, res: Response) {
  const { senhaAtual, novaSenha } = req.body;
  if (!senhaAtual || !novaSenha || typeof novaSenha !== 'string' || novaSenha.trim() === '') {
      res.status(400).json({ erro: 'Dados inválidos.' });
      return;
  }
  try {
    await svc.atualizarSenhaSegura(req.usuario!.sub, senhaAtual, novaSenha);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ erro: e.message });
  }
}

export async function putFilialPadrao(req: Request, res: Response) {
  const codFilial = parseInt(req.body.cod_filial, 10);
  if (isNaN(codFilial)) {
      res.status(400).json({ erro: 'cod_filial inválido.' });
      return;
  }
  try {
    await svc.atualizarFilialPadrao(req.usuario!.sub, codFilial);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ erro: e.message });
  }
}
