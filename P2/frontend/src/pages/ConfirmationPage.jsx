import { useNavigate } from 'react-router-dom';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/GlassCard';
import RoleBadge from '../components/RoleBadge';
import AuthorizationDemo from '../components/AuthorizationDemo';
import { authApi } from '../api/client';

export default function ConfirmationPage({ user, onLogout }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await authApi.logout();
    onLogout();
    navigate('/login');
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-5 py-16">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-primary-light">Ward</h1>
          <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-sm">
            Cerrar sesión
          </button>
        </div>

        {/* Confirmación visible tras login exitoso (requerimiento del enunciado) */}
        <GlassCard className="shadow-glow-success">
          <div className="flex items-center gap-2 text-success">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
            <span className="font-mono text-xs uppercase tracking-widest">Sesión iniciada</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-text">Bienvenido, {user?.nombre}</h2>
          <p className="mt-1 text-text-muted">{user?.correo}</p>
          <div className="mt-4">
            <RoleBadge rol={user?.rol} />
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-1 text-lg font-semibold text-text">Prueba de autorización en vivo</h3>
          <p className="mb-5 text-sm text-text-muted">
            Cada botón consulta al microservicio de autorización a través del backend, con reintentos
            automáticos ante fallas temporales.
          </p>
          <AuthorizationDemo />
        </GlassCard>
      </div>
    </main>
  );
}
