import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import styles from './ProdutosDropdown.module.css';

export interface ProdutoFaixa {
  cod_produto: string;
  produto: string;
  n_amostras: number;
  pct_conforme: number;
}

interface ProdutosDropdownProps {
  id: string | number;
  codEnsaio: string;
  lie: number;
  lse: number;
  dataInicio: string;
  dataFim: string;
  selectedSkus: string[];
  onToggleSku: (codProduto: string) => void;
  /** Se true, usa o endpoint sem-faixa (processo ou produto sem LIE/LSE) */
  semFaixa?: boolean;
}

export const ProdutosDropdown: React.FC<ProdutosDropdownProps> = ({
  id,
  codEnsaio,
  lie,
  lse,
  dataInicio,
  dataFim,
  selectedSkus,
  onToggleSku,
  semFaixa = false,
}) => {
  const [produtos, setProdutos] = useState<ProdutoFaixa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = semFaixa
          ? '/api/analitica/detalhe/faixas/sem-faixa/produtos'
          : '/api/analitica/detalhe/faixas/produtos';

        const params: Record<string, any> = semFaixa
          ? { id, codEnsaio, dataInicio, dataFim }
          : { id, codEnsaio, lie, lse, dataInicio, dataFim };

        const data = await request<ProdutoFaixa[]>(endpoint, { params });
        setProdutos(data || []);
      } catch (err: any) {
        console.error('Erro ao buscar produtos da faixa:', err);
        setError(err.message || 'Erro ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };

    fetchProdutos();
  }, [id, codEnsaio, lie, lse, dataInicio, dataFim, semFaixa]);

  const getComplianceBadge = (pct: number | string | undefined | null) => {
    const numPct = typeof pct === 'number' ? pct : parseFloat(String(pct || 0));
    const validPct = isNaN(numPct) ? 0 : numPct;

    let badgeStyle = styles.badgeConforme;
    let label = 'Conforme';

    if (validPct < 85) {
      badgeStyle = styles.badgeCritico;
      label = 'Crítico';
    } else if (validPct < 95) {
      badgeStyle = styles.badgeInstavel;
      label = 'Instável';
    }

    return (
      <span className={`${styles.badge} ${badgeStyle}`}>
        {validPct.toFixed(1)}% ({label})
      </span>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <span className={styles.loadingText}>Carregando SKUs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        Erro ao carregar produtos da faixa: {error}
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className={styles.empty}>
        Nenhum produto encontrado para este intervalo de especificações.
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th scope="col" className={`${styles.th} ${styles.thSelect}`}>
              Sel.
            </th>
            <th scope="col" className={styles.th}>
              Produto
            </th>
            <th scope="col" className={`${styles.th} ${styles.samples}`}>
              Amostras
            </th>
            <th scope="col" className={`${styles.th} ${styles.compliance}`}>
              Conformidade
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {produtos.map((p) => {
            const isChecked = selectedSkus.includes(p.cod_produto);

            return (
              <tr
                key={p.cod_produto}
                className={`${styles.tr} ${isChecked ? styles.trChecked : ''}`}
                onClick={() => onToggleSku(p.cod_produto)}
              >
                <td className={`${styles.td} ${styles.tdSelect}`} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSku(p.cod_produto)}
                    className={styles.checkbox}
                  />
                </td>
                <td className={`${styles.td} ${styles.productName}`}>
                  {p.produto}
                </td>
                <td className={`${styles.td} ${styles.samples}`}>
                  {p.n_amostras}
                </td>
                <td className={`${styles.td} ${styles.compliance}`}>
                  {getComplianceBadge(p.pct_conforme)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProdutosDropdown;