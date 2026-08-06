import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConfirmationPage from './pages/ConfirmationPage';
import { authApi } from './api/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Al cargar la app, si ya existe una cookie de sesión válida, /me la resuelve
  // y saltamos directo al panel sin pedir login de nuevo.
  useEffect(() => {
    authApi
      .me()
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">Cargando…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/panel" replace /> : <LoginPage onLogin={setUser} />} />
        <Route
          path="/register"
          element={user ? <Navigate to="/panel" replace /> : <RegisterPage onLogin={setUser} />}
        />
        <Route
          path="/panel"
          element={user ? <ConfirmationPage user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? '/panel' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
