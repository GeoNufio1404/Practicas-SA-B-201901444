import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/GlassCard';
import { authApi } from '../api/client';

export default function LoginPage({ onLogin }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authApi.login({ correo, password });
      onLogin(user);
      navigate('/panel');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-5">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary-light">Ward</h1>
          <p className="mt-2 text-text-muted">Inicia sesión para continuar</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="correo" className="block text-xs font-medium uppercase tracking-wider text-text-muted">
                Correo
              </label>
              <input
                id="correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@dominio.com"
                className="glass-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-text-muted">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-error/30 bg-error-strong/10 px-3 py-2 text-sm text-error">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>
        </GlassCard>

        <p className="mt-6 text-center text-sm text-text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-primary hover:text-primary-light">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
