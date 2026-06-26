//    · redireciona para / se não for admin

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';

export default function AdminRoute() {
    const { usuario } = useAuth();
    return usuario?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}