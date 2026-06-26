//    · redireciona para / se não for admin
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

export default function ProtectedRoute() {
    const { autenticado, carregando } = useAuth();
    if (carregando) {
        return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif', color: '#71717a' }}>Carregando...</div>;
    }
    return autenticado ? <Outlet /> : <Navigate to="/login" replace />;
}