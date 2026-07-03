import { Request, Response, NextFunction } from 'express';
import * as ProdutoAcabadoService from '../services/envase/envase-produto-acabado.service';
import * as ChoppService from '../services/envase/envase-chopp.service';
import * as AnalisesAuxiliaresService from '../services/envase/envase-analises-auxiliares.service';
import * as InterunidadesService from '../services/envase/envase-interunidades.service';
import * as EnvasamentoService from '../services/envase/envase-envasamento.service';
import * as RecravacaoService from '../services/envase/envase-recravacao.service';
import * as PasteurizacaoService from '../services/envase/envase-pasteurizacao.service';
import * as LubrificantesService from '../services/envase/envase-lubrificantes.service';
import * as AssoproadorService from '../services/envase/envase-assoprador.service';

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

    // ─── Grupo A — Sub-telas Envase (DW_FAT_RESULTADO direto, sem âncora) ───

    async getProvasHorarias(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final } = req.body;
            const data = await EnvasamentoService.getProvasHorarias({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getAnalisesRecravacao(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final, cod_centro_de_custo, cod_bem } = req.body;
            const data = await RecravacaoService.getAnalisesRecravacao({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                cod_centro_de_custo: Number(cod_centro_de_custo),
                cod_bem: Number(cod_bem),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getAnalisesPasteurizacao(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final, cod_centro_de_custo } = req.body;
            const data = await PasteurizacaoService.getAnalisesPasteurizacao({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                cod_centro_de_custo: Number(cod_centro_de_custo),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getAnalisesLubrificantes(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final, cod_centro_de_custo } = req.body;
            const data = await LubrificantesService.getAnalisesLubrificantes({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                cod_centro_de_custo: Number(cod_centro_de_custo),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },

    async getAnalisesAssoprador(req: Request, res: Response, next: NextFunction) {
        try {
            const { cod_filial, data_inicial, data_final, cod_centro_de_custo } = req.body;
            const data = await AssoproadorService.getAnalisesAssoprador({
                cod_filial: Number(cod_filial),
                data_inicial: String(data_inicial),
                data_final: String(data_final),
                cod_centro_de_custo: Number(cod_centro_de_custo),
            });
            res.json({ ok: true, data });
        } catch (err) {
            next(err);
        }
    },
};
