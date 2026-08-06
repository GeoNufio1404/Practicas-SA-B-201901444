import { useState } from 'react';
import { resourceApi } from '../api/client';

const ROUTES = [
  { key: 'ruta1', label: 'Ruta 1', desc: 'Solo Admin', call: resourceApi.ruta1 },
  { key: 'ruta2', label: 'Ruta 2', desc: 'Admin y Cliente', call: resourceApi.ruta2 },
];

export default function AuthorizationDemo() {
  const [results, setResults] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);

  async function probe(route) {
    setLoadingKey(route.key);
    try {
      const data = await route.call();
      setResults((prev) => ({ ...prev, [route.key]: { ok: true, message: data.mensaje } }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [route.key]: { ok: false, message: err.message } }));
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {ROUTES.map((route) => {
        const result = results[route.key];
        return (
          <div
            key={route.key}
            className="flex flex-col gap-3 rounded-xl border border-border bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-sm uppercase tracking-wide text-text">{route.label}</p>
              <p className="text-xs text-text-muted">{route.desc}</p>
              {result && <p className="mt-1 text-xs text-text-muted">{result.message}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {result && (
                <span
                  className={`rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wide ${
                    result.ok
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-error/40 bg-error-strong/10 text-error'
                  }`}
                >
                  {result.ok ? 'Permitido' : 'Denegado'}
                </span>
              )}
              <button onClick={() => probe(route)} disabled={loadingKey === route.key} className="btn-ghost px-4 py-2 text-sm">
                {loadingKey === route.key ? 'Consultando…' : 'Probar acceso'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
