import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import LoginPage from '../pages/Login';
import DashboardPage from '../pages/Dashboard';
import DetalhePage from '../pages/Detalhe/DetalhePage';
import EscolhaNatureza from '../pages/MacroProcesso/EscolhaNatureza';

import ConfigPage from '../pages/Config';
import BuscaPage from '../pages/Busca/BuscaPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <MainLayout />,
      children: [
        { path: '/', element: <DashboardPage /> },
        { path: '/detalhe/:tipo/:id', element: <DetalhePage /> },
        { path: '/busca', element: <BuscaPage /> },
        { path: '/config', element: <ConfigPage /> },
        { path: '/macro-processo/:origem', element: <EscolhaNatureza /> },
        { path: '/detalhe/macro-processo/:origem/:natureza', element: <DetalhePage /> },

        {
          element: <AdminRoute />,
          children: []
        },
      ]
    }]
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);