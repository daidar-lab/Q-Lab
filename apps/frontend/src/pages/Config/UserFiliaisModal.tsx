import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Filial } from '../../hooks/useFiliais';
import { getFiliais } from '../../services/filiais.api';
import { listarFiliaisUsuario, vincularFilialUsuario, desvincularFilialUsuario } from '../../services/usuarios.api';
import { useAuth } from '../../contexts/AuthProvider';

interface Props {
  userId: number;
  userName: string;
  onClose: () => void;
}

export function UserFiliaisModal({ userId, userName, onClose }: Props) {
  const { usuario, refreshSession } = useAuth();
  const [todasFiliais, setTodasFiliais] = useState<Filial[]>([]);
  const [vinculos, setVinculos] = useState<{ cod_filial: number; filial_padrao: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedFilial, setSelectedFilial] = useState<string>('');
  const [isPadrao, setIsPadrao] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, [userId]);

  async function carregarDados() {
    setLoading(true);
    setErro(null);
    try {
      const [filiais, userVinculos] = await Promise.all([
        getFiliais(),
        listarFiliaisUsuario(userId)
      ]);
      setTodasFiliais(filiais);
      setVinculos(userVinculos);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar filiais do usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFilial) return;
    
    setSaving(true);
    setErro(null);
    try {
      await vincularFilialUsuario(userId, Number(selectedFilial), isPadrao);
      if (usuario?.id === userId) {
        await refreshSession();
      }
      await carregarDados();
      setSelectedFilial('');
      setIsPadrao(false);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao vincular filial.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(cod_filial: number) {
    if (!confirm('Deseja realmente remover esta filial do usuário?')) return;
    setSaving(true);
    try {
      await desvincularFilialUsuario(userId, cod_filial);
      if (usuario?.id === userId) {
        await refreshSession();
      }
      await carregarDados();
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao desvincular filial.');
    } finally {
      setSaving(false);
    }
  }

  // Styles (copied from ConfigPage)
  const overlay: CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  };
  const modal: CSSProperties = {
    background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px',
    padding: '24px', boxSizing: 'border-box',
  };
  const button: CSSProperties = {
    padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#D67808',
    color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
  };
  const secondaryButton: CSSProperties = {
    padding: '4px 8px', borderRadius: '4px', border: '1px solid #fca5a5', background: '#fee2e2',
    color: '#991b1b', fontWeight: 600, cursor: 'pointer', fontSize: '12px',
  };
  const field: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' };
  const input: CSSProperties = { padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D67808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Filiais de {userName}
          </h3>
        </div>

        {erro && (
          <p style={{ color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', margin: '0 0 16px' }}>
            {erro}
          </p>
        )}

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ ...field, marginBottom: 0, flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 500 }}>Vincular Nova Filial</label>
                <select style={input} value={selectedFilial} onChange={e => setSelectedFilial(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {todasFiliais
                    .filter(f => !vinculos.some(v => v.cod_filial === f.cod_filial))
                    .map(f => (
                    <option key={f.cod_filial} value={f.cod_filial}>{f.cod_filial} - {f.filial}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <input type="checkbox" id="isPadrao" checked={isPadrao} onChange={e => setIsPadrao(e.target.checked)} />
                <label htmlFor="isPadrao" style={{ fontSize: '12px' }}>Padrão?</label>
              </div>
              <button type="submit" style={button} disabled={saving || !selectedFilial}>Add</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {vinculos.length === 0 && <p style={{ fontSize: '13px', color: '#64748b' }}>Nenhuma filial vinculada.</p>}
              {vinculos.map(v => {
                const f = todasFiliais.find(x => x.cod_filial === v.cod_filial);
                return (
                  <div key={v.cod_filial} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{f?.filial ?? `Filial ${v.cod_filial}`}</strong>
                      {v.filial_padrao === 1 && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PADRÃO</span>}
                    </div>
                    <button type="button" style={secondaryButton} onClick={() => handleRemove(v.cod_filial)} disabled={saving}>
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" style={{ ...button, background: '#f1f5f9', color: '#0f172a' }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
