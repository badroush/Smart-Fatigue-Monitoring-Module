import { NavLink } from 'react-router-dom';

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function IconTruck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}
function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );
}
function IconCog({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const allNavigation = [
  { name: 'Tableau de bord', href: '/', Icon: IconDashboard, adminOnly: true },
  { name: 'Alertes', href: '/alerts', Icon: IconAlert, adminOnly: false },
  { name: 'Véhicules', href: '/vehicles', Icon: IconTruck, adminOnly: true },
  { name: 'Conducteurs', href: '/conducteurs', Icon: IconUsers, adminOnly: true },
  { name: 'Surveillance module', href: '/module-surveillance', Icon: IconShield, adminOnly: false },
  { name: 'Statistiques', href: '/statistics', Icon: IconChart, adminOnly: true },
  { name: 'Paramètres', href: '/settings', Icon: IconCog, adminOnly: true },
];

export default function Sidebar() {
  const role = localStorage.getItem('sfam_role');
  const navigation =
    role === 'superviseur'
      ? allNavigation.filter((item) => !item.adminOnly)
      : allNavigation;

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-slate-700 bg-slate-900">
      <div className="flex h-14 items-center border-b border-slate-700 px-4 border-l-4 border-amber-500 bg-slate-950/80">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">SFAM</span>
          <span className="text-lg font-bold tracking-tight text-slate-100">Supervision</span>
        </div>
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 px-2 pb-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center gap-3 border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive
                  ? 'border-amber-600/70 bg-slate-800 text-amber-100 shadow-[inset_3px_0_0_0_rgba(245,158,11,0.9)]'
                  : 'border-transparent text-slate-400 hover:border-slate-600 hover:bg-slate-800/80 hover:text-slate-200'
              }`
            }
          >
            <item.Icon className="h-5 w-5 shrink-0 opacity-90" />
            <span className="leading-tight">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700 bg-slate-950/50 px-4 py-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Build v1.0.0</div>
        <div className="text-[10px] text-slate-600">Poste opérateur</div>
      </div>
    </aside>
  );
}
