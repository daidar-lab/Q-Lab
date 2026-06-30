// apps/backend/src/app.ts

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import opcoesRoutes from './routes/opcoes.routes';
import inspecaoRoutes from './routes/inspecao.routes';
import usuariosRoutes from './routes/usuarios.routes';
import analiticaRoutes from './routes/analitica.routes';
import detalheRoutes from './routes/detalhe.routes';
import faixaRoutes from './routes/faixa.routes';
import resumoDashboardRoutes from './routes/resumo-dashboard.routes';
import macroProcessoRoutes from './routes/macroProcesso.routes';
import envaseRoutes from './routes/envase.routes';
import cipRoutes from './routes/cip.routes';
import fermentoRoutes from './routes/fermento.routes';
import fisicoRoutes from './routes/fisico.routes';
import processoRoutes from './routes/processo.routes';
import microbiologiaRoutes from './routes/microbiologia.routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

// ─── Middlewares globais ──────────────────────────────────────────────────────

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

app.use(express.json());

// ─── Rotas ────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/opcoes', opcoesRoutes);
app.use('/api/inspecao', inspecaoRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/analitica', analiticaRoutes);
app.use('/api/analitica/detalhe', faixaRoutes);
app.use('/api/detalhe', detalheRoutes);
app.use('/api/resumo-dashboard', resumoDashboardRoutes);
app.use('/api/macro-processo', macroProcessoRoutes);
app.use('/qlab/envase', envaseRoutes);
app.use('/qlab/cip', cipRoutes);
app.use('/qlab/fermento', fermentoRoutes);
app.use('/qlab/fisico', fisicoRoutes);
app.use('/qlab/processo', processoRoutes);
app.use('/qlab', microbiologiaRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── Error handler — deve ser o último ───────────────────────────────────────

app.use(errorMiddleware);

export default app;