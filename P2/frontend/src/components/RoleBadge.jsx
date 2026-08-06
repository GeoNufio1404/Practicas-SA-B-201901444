export default function RoleBadge({ rol }) {
  const isAdmin = rol === 'admin';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider ${
        isAdmin ? 'border-primary/40 bg-primary/10 text-primary' : 'border-text-muted/30 bg-white/5 text-text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-primary' : 'bg-text-muted'}`} />
      {rol}
    </span>
  );
}
