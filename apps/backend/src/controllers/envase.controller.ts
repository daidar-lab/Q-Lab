import { Request, Response, NextFunction } from 'express';
import * as ProdutoAcabadoService from '../services/envase/envase-produto-acabado.service';
import * as ChoppService from '../services/envase/envase-chopp.service';
import * as AnalisesAuxiliaresService from '../services/envase/envase-analises-auxiliares.service';
import * as InterunidadesService from '../services/envase/envase-interunidades.service';

export const EnvaseController = {
    async getProdutoAcabado(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await ProdutoAcabadoService.getProdutoAcabado({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getChopp(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await ChoppService.getChopp({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getArrolhamento(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await AnalisesAuxiliaresService.getAnaliseAuxiliar({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                tipo: 'arrolhamento',
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getAssoprador(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await AnalisesAuxiliaresService.getAnaliseAuxiliar({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                tipo: 'assoprador',
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getLubrificante(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await AnalisesAuxiliaresService.getAnaliseAuxiliar({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                tipo: 'lubrificante',
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getRecravacao(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await AnalisesAuxiliaresService.getAnaliseAuxiliar({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                tipo: 'recravacao',
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getPasteurizador(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await AnalisesAuxiliaresService.getAnaliseAuxiliar({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                tipo: 'pasteurizador',
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getProdutoInterunidades(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await InterunidadesService.getProdutoInterunidades({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },
};
