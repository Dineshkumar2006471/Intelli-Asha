import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

interface SidebarProps {
  role?: 'field-worker' | 'supervisor';
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ role = 'supervisor', isOpen = false, onClose }: SidebarProps) => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const displayName = currentUser?.displayName || (role === 'field-worker' ? 'ASHA Worker' : 'Supervisor');
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isActive = (path: string): boolean => location.pathname === path;
  const linkClass = (path: string): string => 
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border-2 ${
      isActive(path) 
        ? 'border-primary text-primary font-bold bg-transparent' 
        : 'border-transparent text-on-surface-variant hover:bg-surface-container-low'
    }`;
  const iconStyle = (path: string) => ({ fontVariationSettings: isActive(path) ? "'FILL' 1" : "'FILL' 0" });

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const fieldWorkerLinks = [
    { path: '/app/field', icon: 'home', label: 'Home' },
    { path: '/app/log-visit', icon: 'mic', label: 'Log a Visit' },
    { path: '/app/route', icon: 'route', label: 'Route' },
    { path: '/app/records', icon: 'folder', label: 'Records' },
    { path: '/app/earnings', icon: 'payments', label: 'Earnings' },
    { path: '/app/schedule', icon: 'calendar_today', label: 'Schedule' },
  ];

  const supervisorLinks = [
    { path: '/dashboard/supervisor', icon: 'dashboard', label: 'Overview' },
    { path: '/dashboard/dho', icon: 'map', label: 'Coverage Map' },
    { path: '/dashboard/supervisor/directory', icon: 'groups', label: 'Workers' },
    { path: '/dashboard/supervisor/alerts', icon: 'notifications_active', label: 'Alerts' },
    { path: '/dashboard/supervisor/reports', icon: 'summarize', label: 'Reports' },
    { path: '#settings', icon: 'settings', label: 'Settings' },
  ];

  const links = role === 'field-worker' ? fieldWorkerLinks : supervisorLinks;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <nav 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-default py-6 px-4 flex flex-col h-screen shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" onClick={onClose} className="flex items-center gap-3">
            <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-10 w-auto object-contain cursor-pointer" />
          </Link>
          <button 
            className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full"
            onClick={onClose}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex flex-col gap-1 flex-grow overflow-y-auto" role="menu" aria-label="Sidebar Navigation">
          {links.map(link => (
            link.path.startsWith('#') ? (
              <a key={link.path} href={link.path} onClick={onClose} className={linkClass(link.path)} aria-current={isActive(link.path) ? 'page' : undefined} aria-label={link.label} role="menuitem">
                <span className="material-symbols-outlined" style={iconStyle(link.path)} aria-hidden="true">{link.icon}</span>
                <span className="font-label-md text-label-md">{link.label}</span>
              </a>
            ) : (
              <Link key={link.path} to={link.path} onClick={onClose} className={linkClass(link.path)} aria-current={isActive(link.path) ? 'page' : undefined} aria-label={link.label} role="menuitem">
                <span className="material-symbols-outlined text-primary" style={iconStyle(link.path)} aria-hidden="true">{link.icon}</span>
                <span className="font-label-md text-label-md">{link.label}</span>
              </Link>
            )
          ))}
        </div>

        {/* User Profile + Logout */}
        <div className="mt-auto pt-4 border-t border-border-default space-y-3 shrink-0">
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
          <button onClick={() => { logout(); if(onClose) onClose(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
