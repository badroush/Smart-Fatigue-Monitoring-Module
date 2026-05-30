import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('sfam_token');
    localStorage.removeItem('sfam_role');
    localStorage.removeItem('sfam_login');
    localStorage.removeItem('sfam_auth_time');
    localStorage.removeItem('sfam_auth');
    navigate('/login');
  };

  const displayLogin =
    localStorage.getItem('sfam_login') || 'Utilisateur';
  const displayRole =
    localStorage.getItem('sfam_role') === 'admin'
      ? 'Administrateur'
      : localStorage.getItem('sfam_role') === 'superviseur'
        ? 'Superviseur'
        : 'Session';

  return (
    <header className="shrink-0 border-b border-slate-600 bg-slate-900">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="hidden min-w-0 flex-1 max-w-lg sm:block">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche globale…"
              className="block w-full border border-slate-600 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-600/80 focus:outline-none focus:ring-1 focus:ring-amber-600/50"
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
          <button
            type="button"
            className="rounded border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Notifications"
          >
            <span className="relative inline-flex">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-slate-900" />
            </span>
          </button>

          <div className="flex items-center gap-3 border-l border-slate-700 pl-3 sm:pl-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-600 bg-slate-800 text-sm font-bold text-amber-400">
              S
            </div>
            <div className="hidden md:block min-w-0">
              <div className="truncate text-xs font-semibold uppercase tracking-wide text-slate-200">
                {displayLogin}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-500/90">
                {displayRole}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-300 transition hover:border-red-700 hover:bg-red-950/70"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
