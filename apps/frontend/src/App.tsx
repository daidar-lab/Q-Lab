// apps/frontend/src/App.tsx
import { RouterProvider }   from 'react-router-dom';
import { router }           from './router';
import { AuthProvider }     from './contexts/AuthProvider';
import { ContextoProvider } from './contexts/ContextoProvider';

export default function App() {
  return (
    <AuthProvider>
      <ContextoProvider>
        <RouterProvider router={router} />
      </ContextoProvider>
    </AuthProvider>
  );
}