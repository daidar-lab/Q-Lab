import { useState, useEffect, type FormEvent } from 'react';
import { listar, criar, atualizar, desativar } from '../../services/usuarios.api';
import { atualizarMeta as atualizarMetaApi, atualizarSenha as atualizarSenhaApi } from '../../services/perfil.api';
import { useContexto } from '../../contexts/ContextoProvider';
import { useAuth } from '../../contexts/AuthProvider';
import { UserFiliaisModal } from './UserFiliaisModal';
import type { Usuario, Role } from '@qlab/types';
import type { CSSProperties } from 'react';

type UsuarioSemSenha = Omit<Usuario, 'senha'>;

export default function ConfigPage() {
    const { meta: metaContexto, setMeta: setMetaContexto } = useContexto();
    const { refreshSession, usuario } = useAuth();
    
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
    
    // Senha states
    const [minhaSenhaAtualValue, setMinhaSenhaAtualValue] = useState('');
    const [novaSenhaValue, setNovaSenhaValue] = useState('');
    const [confirmarSenhaValue, setConfirmarSenhaValue] = useState('');
    const [msgSenha, setMsgSenha] = useState('');
    const [savingSenha, setSavingSenha] = useState(false);

    useEffect(() => {
        setMetaValue(metaContexto.toString());
    }, [metaContexto]);

    async function handleSaveSenha() {
        if (!minhaSenhaAtualValue.trim() || !novaSenhaValue.trim() || !confirmarSenhaValue.trim()) {
            alert('Preencha todos os campos de senha.');
            return;
        }
        if (novaSenhaValue.length < 8) {
            alert('A nova senha deve ter no mínimo 8 caracteres.');
            return;
        }
        if (novaSenhaValue !== confirmarSenhaValue) {
            alert('A nova senha e a confirmação não conferem.');
            return;
        }
        setSavingSenha(true);
        try {
            await atualizarSenhaApi(minhaSenhaAtualValue, novaSenhaValue);
            setMsgSenha('Senha atualizada com sucesso!');
            setMinhaSenhaAtualValue('');
            setNovaSenhaValue('');
            setConfirmarSenhaValue('');
            setTimeout(() => setMsgSenha(''), 3000);
        } catch (e: any) {
            alert(e.message ?? 'Erro ao alterar senha.');
        } finally {
            setSavingSenha(false);
        }
    }

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
        if (usuario?.role === 'admin') {
            carregarUsuarios();
        }
    }, [usuario?.role]);

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
        background: '#D67808',
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
            <h2 style={{ ...title, marginBottom: '24px', fontSize: '24px' }}>Configurações da Conta</h2>

            {/* Seção Meta de Conformidade */}
            <div style={{ ...card, marginBottom: '28px', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D67808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Minha Meta de Conformidade</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 -8px' }}>Essa meta será o alvo para os cálculos no Dashboard.</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={label}>Meta Alvo</label>
                        <div style={{ position: 'relative', width: isMobile ? '120px' : '140px' }}>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={metaValue}
                                onChange={e => setMetaValue(e.target.value)}
                                style={{ ...input, width: '100%', paddingRight: '28px', boxSizing: 'border-box' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>%</span>
                        </div>
                    </div>
                    <button style={{ ...button, flexGrow: isMobile ? 1 : 0, height: '41px' }} onClick={handleSaveMeta} disabled={savingMeta}>
                        {savingMeta ? 'Salvando...' : 'Salvar Meta'}
                    </button>
                </div>
                {msgMeta && <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>{msgMeta}</span>}
            </div>

            <div style={{ ...card, marginBottom: '28px', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D67808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Alterar Minha Senha</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 -8px' }}>Digite a senha atual e a nova senha para atualizar seu acesso.</p>
                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', width: '100%', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 180px', minWidth: 0 }}>
                        <label style={label}>Senha Atual</label>
                        <input
                            type="password"
                            value={minhaSenhaAtualValue}
                            onChange={e => setMinhaSenhaAtualValue(e.target.value)}
                            style={{ ...input, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 180px', minWidth: 0 }}>
                        <label style={label}>Nova Senha</label>
                        <input
                            type="password"
                            value={novaSenhaValue}
                            onChange={e => setNovaSenhaValue(e.target.value)}
                            style={{ ...input, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 180px', minWidth: 0 }}>
                        <label style={label}>Confirmar Nova Senha</label>
                        <input
                            type="password"
                            value={confirmarSenhaValue}
                            onChange={e => setConfirmarSenhaValue(e.target.value)}
                            style={{ ...input, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mínimo 8 caracteres.</span>
                    <button style={{ ...button, flexGrow: isMobile ? 1 : 0 }} onClick={handleSaveSenha} disabled={savingSenha}>
                        {savingSenha ? 'Salvando...' : 'Salvar Senha'}
                    </button>
                </div>
                {msgSenha && <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>{msgSenha}</span>}
            </div>

            {usuario?.role === 'admin' && (
                <>
                    <div style={{ ...header, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D67808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <h2 style={title}>Gerenciar Usuários</h2>
                        </div>
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
                                        borderColor: '#fdba74',
                                        background: '#ffedd5',
                                        color: '#c2410c',
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
            </>
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