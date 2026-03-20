import { NavLink } from 'react-router-dom';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: '📊' },
  { name: 'Alertes', href: '/alerts', icon: '🚨' },
  { name: 'Véhicules', href: '/vehicles', icon: '🚛' },
  { name: 'Statistiques', href: '/statistics', icon: '📈' },
  { name: 'Paramètres', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-sfam-primary text-white shadow-lg z-50">
      <div className="flex items-center justify-center h-16 border-b border-blue-800">
        <div className="text-2xl font-bold flex items-center">
          <span className="mr-2">🛡️</span>
          <span>SFAM</span>
        </div>
      </div>
      
      <nav className="mt-5 px-2 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <span className="mr-3 text-xl">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-blue-800">
        <div className="text-xs text-blue-200">
          <div>SFAM Dashboard</div>
          <div>v1.0.0</div>
        </div>
      </div>
    </div>
  );
}