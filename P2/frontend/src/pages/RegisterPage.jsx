import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/GlassCard';
import { authApi } from '../api/client';

export default function RegisterPage({ onLogin }) {
  const [form, setForm] = useState({ nombre: '', correo: '', password: '', rol: 'cliente' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
      const user = await authApi.login({ correo: form.correo, password: form.password });
      onLogin(user);
      navigate('/panel');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-5 py-12">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary-light">Ward</h1>
          <p className="mt-2 text-text-muted">Crea tu cuenta</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted">Nombre</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Tu nombre completo"
                className="glass-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted">Correo</label>
              <input
                type="email"
                required
                value={form.correo}
                onChange={(e) => update('correo', e.target.value)}
                placeholder="tucorreo@dominio.com"
                className="glass-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted">Contraseña</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="glass-input"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium uppercase tracking-wider text-text-muted">Rol</span>
              <div className="grid grid-cols-2 gap-2">
                {['cliente', 'admin'].map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => update('rol', r)}
                    className={`rounded-lg border px-4 py-2.5 font-mono text-sm uppercase tracking-wide transition ${
                      form.rol === r
                        ? 'border-primary bg-primary/10 text-primary shadow-glow'
                        : 'border-border bg-black/10 text-text-muted hover:border-border-strong'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-error/30 bg-error-strong/10 px-3 py-2 text-sm text-error">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        </GlassCard>

        <p className="mt-6 text-center text-sm text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-light">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
