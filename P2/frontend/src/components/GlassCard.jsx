export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass-panel p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] ${className}`}>
      {children}
    </div>
  );
}
