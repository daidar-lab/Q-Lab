import { useState, useEffect, type FormEvent } from 'react';
import { listar, criar, atualizar, desativar } from '../../services/usuarios.api';
import { atualizarMeta as atualizarMetaApi } from '../../services/perfil.api';
import { useContexto } from '../../contexts/ContextoProvider';
import { useAuth } from '../../contexts/AuthProvider';
import { UserFiliaisModal } from './UserFiliaisModal';
import type { Usuario, Role } from '@qlab/types';
import type { CSSProperties } from 'react';

type UsuarioSemSenha = Omit<Usuario, 'senha'>;

export default function ConfigPage() {
    const { meta: metaContexto, setMeta: setMetaContexto } = useContexto();
    const { refreshSession } = useAuth();
    
    const [usuarios, setUsuarios] = useState<UsuarioSemSenha[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 600);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Form states
    const [editingUser, setEditingUser] = useState<UsuarioSemSenha | null>(null);
    const [form, setForm] = useState({ nome: '', login: '', senha: '', role: 'user' as Role });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showFiliaisModal, setShowFiliaisModal] = useState<UsuarioSemSenha | null>(null);

    // Meta states
    const [metaValue, setMetaValue] = useState(() => metaContexto.toString());
    const [msgMeta, setMsgMeta] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);

    useEffect(() => {
        setMetaValue(metaContexto.toString());
    }, [metaContexto]);

    async function handleSaveMeta() {
        const val = parseFloat(metaValue);
        if (isNaN(val) || val < 0 || val > 100) {
            alert('A meta de conformidade deve ser um número entre 0 e 100.');
            return;
        }
        setSavingMeta(true);
        try {
            await atualizarMetaApi(val);
            setMetaContexto(val);
            await refreshSession();
            setMsgMeta('Meta de conformidade salva com sucesso!');
            setTimeout(() => setMsgMeta(''), 3000);
        } catch (e: any) {
            alert(e.message ?? 'Erro ao salvar meta no banco.');
        } finally {
            setSavingMeta(false);
        }
    }

    useEffect(() => {
        carregarUsuarios();
    }, []);

    async function carregarUsuarios() {
        setLoading(true);
        setErro(null);
        try {
            const data = await listar();
            setUsuarios(data);
        } catch (e: any) {
            setErro(e.message ?? 'Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    }

    function handleEdit(user: UsuarioSemSenha) {
        setEditingUser(user);
        setForm({
            nome: user.nome,
            login: user.login,
            senha: '', // leave empty unless changing
            role: user.role,
        });
        setFormError(null);
        setShowForm(true);
    }

    function handleAddNew() {
        setEditingUser(null);
        setForm({ nome: '', login: '', senha: '', role: 'user' });
        setFormError(null);
        setShowForm(true);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);

        try {
            if (editingUser) {
                // Update
                const updatePayload: any = {
                    nome: form.nome,
                    login: form.login,
                    role: form.role,
                };
                if (form.senha.trim()) {
                    updatePayload.senha = form.senha;
                }
                await atualizar(editingUser.id, updatePayload);
            } else {
                // Create
                if (!form.senha.trim()) {
                    throw new Error('Senha é obrigatória para novos usuários.');
                }
                await criar({
                    nome: form.nome,
                    login: form.login,
                    senha: form.senha,
                    role: form.role,
                });
            }
            setShowForm(false);
            setEditingUser(null);
            carregarUsuarios();
        } catch (e: any) {
            setFormError(e.message ?? 'Erro ao salvar usuário.');
        } finally {
            setFormLoading(false);
        }
    }

    async function handleToggleAtivo(user: UsuarioSemSenha) {
        if (confirm(`Deseja alterar o status de ativação de ${user.nome}?`)) {
            try {
                if (user.ativo) {
                    await desativar(user.id);
                } else {
                    await atualizar(user.id, { ativo: true });
                }
                carregarUsuarios();
            } catch (e: any) {
                alert(e.message ?? 'Erro ao alterar status do usuário.');
            }
        }
    }

    // Styles
    const container: CSSProperties = {
        padding: '16px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
    };

    const header: CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    };

    const title: CSSProperties = {
        margin: 0,
        fontSize: '20px',
        fontWeight: 700,
        color: '#0f172a',
    };

    const button: CSSProperties = {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        background: '#2563eb',
        color: '#fff',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '13px',
    };

    const secondaryButton: CSSProperties = {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        color: '#1e293b',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '13px',
    };

    const list: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '16px',
    };

    const card: CSSProperties = {
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    };

    const badge = (ativo: boolean): CSSProperties => ({
        fontSize: '10px',
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: '4px',
        background: ativo ? '#dcfce7' : '#fecaca',
        color: ativo ? '#166534' : '#991b1b',
        marginLeft: '8px',
    });

    const overlay: CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    };

    const modal: CSSProperties = {
        background: '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        boxSizing: 'border-box',
    };

    const field: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '16px',
    };

    const label: CSSProperties = {
        fontSize: '13px',
        fontWeight: 500,
        color: '#1e293b',
    };

    const input: CSSProperties = {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '15px',
        outline: 'none',
        background: '#fff',
    };

    return (
        <div style={container}>
            {/* Seção Meta de Conformidade */}
            <div style={{ ...card, marginBottom: '28px', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Minha Meta de Conformidade</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 -8px' }}>Essa meta será o alvo para os cálculos no Dashboard.</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={metaValue}
                        onChange={e => setMetaValue(e.target.value)}
                        style={{ ...input, width: isMobile ? '80px' : '120px', flexGrow: isMobile ? 1 : 0 }}
                    />
                    <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 600 }}>%</span>
                    <button style={{ ...button, flexGrow: isMobile ? 2 : 0 }} onClick={handleSaveMeta} disabled={savingMeta}>
                        {savingMeta ? 'Salvando...' : 'Salvar Meta'}
                    </button>
                </div>
                {msgMeta && <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>{msgMeta}</span>}
            </div>

            <div style={{ ...header, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px' }}>
                <h2 style={title}>Gerenciar Usuários</h2>
                <button style={{ ...button, alignSelf: isMobile ? 'stretch' : 'auto' }} onClick={handleAddNew}>
                    + Novo Usuário
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Carregando usuários...</p>
            ) : erro ? (
                <div style={{ color: '#7f1d1d', background: '#fee2e2', padding: '12px', borderRadius: '8px' }}>{erro}</div>
            ) : (
                <div style={list}>
                    {usuarios.map(user => (
                        <div key={user.id} style={{ ...card, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '12px' : '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                    <strong style={{ fontSize: '15px', color: '#0f172a', wordBreak: 'break-word' }}>{user.nome}</strong>
                                    <span style={badge(user.ativo)}>{user.ativo ? 'Ativo' : 'Inativo'}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Login: {user.login} | Role: {user.role}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                                <button
                                    style={{
                                        ...secondaryButton,
                                        flex: isMobile ? 1 : 'unset',
                                        padding: isMobile ? '8px 8px' : secondaryButton.padding,
                                        borderColor: '#bfdbfe',
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        textAlign: 'center'
                                    }}
                                    onClick={() => setShowFiliaisModal(user)}
                                >
                                    Filiais
                                </button>
                                <button
                                    style={{
                                        ...secondaryButton,
                                        flex: isMobile ? 1 : 'unset',
                                        padding: isMobile ? '8px 8px' : secondaryButton.padding,
                                        textAlign: 'center'
                                    }}
                                    onClick={() => handleEdit(user)}
                                >
                                    Editar
                                </button>
                                <button
                                    style={{
                                        ...secondaryButton,
                                        flex: isMobile ? 1.2 : 'unset',
                                        padding: isMobile ? '8px 8px' : secondaryButton.padding,
                                        textAlign: 'center',
                                        color: user.ativo ? '#991b1b' : '#166534',
                                        borderColor: user.ativo ? '#fca5a5' : '#86efac',
                                        background: user.ativo ? '#fee2e2' : '#dcfce7',
                                    }}
                                    onClick={() => handleToggleAtivo(user)}
                                >
                                    {user.ativo ? 'Desativar' : 'Ativar'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {usuarios.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#a1a1aa' }}>Nenhum usuário cadastrado.</p>
                    )}
                </div>
            )}

            {showForm && (
                <div style={overlay}>
                    <div style={modal}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>
                            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div style={field}>
                                <label style={label}>Nome</label>
                                <input
                                    style={input}
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    required
                                />
                            </div>

                            <div style={field}>
                                <label style={label}>Login</label>
                                <input
                                    style={input}
                                    type="text"
                                    value={form.login}
                                    onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                                    required
                                    disabled={!!editingUser}
                                />
                            </div>

                            <div style={field}>
                                <label style={label}>Senha {editingUser && '(deixe em branco para manter)'}</label>
                                <input
                                    style={input}
                                    type="password"
                                    value={form.senha}
                                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                                    required={!editingUser}
                                />
                            </div>

                            <div style={field}>
                                <label style={label}>Role</label>
                                <select
                                    style={input}
                                    value={form.role}
                                    onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {formError && (
                                <p style={{ color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', margin: '0 0 16px' }}>
                                    {formError}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button type="button" style={secondaryButton} onClick={() => setShowForm(false)} disabled={formLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" style={button} disabled={formLoading}>
                                    {formLoading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showFiliaisModal && (
                <UserFiliaisModal
                    userId={showFiliaisModal.id}
                    userName={showFiliaisModal.nome}
                    onClose={() => setShowFiliaisModal(null)}
                />
            )}
        </div>
    );
}