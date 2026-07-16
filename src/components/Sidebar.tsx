
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  role?: 'field-worker' | 'supervisor';
}

const Sidebar = ({ role = 'supervisor' }: SidebarProps) => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const displayName = currentUser?.displayName || (role === 'field-worker' ? 'ASHA Worker' : 'Supervisor');
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isActive = (path: string): boolean => location.pathname === path;
  const linkClass = (path: string): string => 
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      isActive(path) 
        ? 'bg-primary-container text-on-primary-container font-bold' 
        : 'text-on-surface-variant hover:bg-surface-container-low'
    }`;
  const iconStyle = (path: string) => ({ fontVariationSettings: isActive(path) ? "'FILL' 1" : "'FILL' 0" });

  const fieldWorkerLinks = [
    { path: '/app/field', icon: 'home', label: 'Home' },
    { path: '/app/log-visit', icon: 'mic', label: 'Log a Visit' },
    { path: '#route', icon: 'route', label: 'Route' },
    { path: '#records', icon: 'folder', label: 'Records' },
    { path: '#earnings', icon: 'payments', label: 'Earnings' },
    { path: '#schedule', icon: 'calendar_today', label: 'Schedule' },
  ];

  const supervisorLinks = [
    { path: '/dashboard/supervisor', icon: 'dashboard', label: 'Overview' },
    { path: '/dashboard/dho', icon: 'map', label: 'Coverage Map' },
    { path: '/dashboard/supervisor/directory', icon: 'groups', label: 'Workers' },
    { path: '/dashboard/supervisor/alerts', icon: 'notifications_active', label: 'Alerts' },
    { path: '#reports', icon: 'summarize', label: 'Reports' },
    { path: '#settings', icon: 'settings', label: 'Settings' },
  ];

  const links = role === 'field-worker' ? fieldWorkerLinks : supervisorLinks;

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 border-r border-border-default bg-surface py-6 px-4 z-40 shrink-0">
      {/* Logo + Role */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-10 w-auto object-contain" />
        <div className="overflow-hidden">
          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {role === 'field-worker' ? 'Field Worker' : 'Supervisor'}
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex flex-col gap-1 flex-grow" role="menu" aria-label="Sidebar Navigation">
        {links.map(link => (
          link.path.startsWith('#') ? (
            <a key={link.path} href={link.path} className={linkClass(link.path)} aria-current={isActive(link.path) ? 'page' : undefined} aria-label={link.label} role="menuitem">
              <span className="material-symbols-outlined" style={iconStyle(link.path)} aria-hidden="true">{link.icon}</span>
              <span className="font-label-md text-label-md">{link.label}</span>
            </a>
          ) : (
            <Link key={link.path} to={link.path} className={linkClass(link.path)} aria-current={isActive(link.path) ? 'page' : undefined} aria-label={link.label} role="menuitem">
              <span className="material-symbols-outlined text-primary" style={iconStyle(link.path)} aria-hidden="true">{link.icon}</span>
              <span className="font-label-md text-label-md">{link.label}</span>
            </Link>
          )
        ))}
      </div>

      {/* User Profile + Logout */}
      <div className="mt-auto pt-4 border-t border-border-default space-y-3">
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold font-label-md text-label-md shrink-0">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="font-label-md text-label-md text-on-surface font-semibold truncate">{displayName}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
              {role === 'field-worker' ? 'ASHA Worker' : 'PHC Supervisor'}
            </p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-md text-label-md">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
