import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar fixe à gauche */}
      <Sidebar />
      
      {/* Contenu principal */}
      <div className="flex flex-col flex-1 ml-64">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-white shadow border-t border-gray-200 p-4 text-center text-sm text-gray-500">
          © 2026 SFAM - Système de Surveillance de la Fatigue du Conducteur - Badr BENAMARA
        </footer>
      </div>
    </div>
  );
}