import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-64 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto dashboard-industrial-bg px-5 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
        <footer className="border-t border-slate-700 bg-slate-900 px-4 py-3 text-center text-[11px] uppercase tracking-[0.12em] text-slate-500">
          © 2026 SFAM — Surveillance fatigue conducteur — Badr Benamara
        </footer>
      </div>
    </div>
  );
}