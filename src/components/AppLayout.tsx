import { useState, ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useFCM } from '../hooks/useFCM';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Request FCM permissions and handle tokens
  useFCM();
  
  // Determine role based on URL path
  const role = location.pathname.startsWith('/app') ? 'field-worker' : 'supervisor';

  const isActive = (path: string) => location.pathname === path;
  
  const fieldWorkerLinks = [
    { path: '/app/field', icon: 'home', label: 'Home' },
    { path: '/app/log-visit', icon: 'mic', label: 'Log Visit' },
    { path: '/app/route', icon: 'route', label: 'Route' },
    { path: '/app/records', icon: 'folder', label: 'Records' },
    { path: '/app/earnings', icon: 'payments', label: 'Earnings' },
  ];

  return (
    <div className="min-h-screen bg-background-subtle flex overflow-hidden flex-col md:flex-row">
      {/* Sidebar - Handles both mobile drawer and desktop fixed mode */}
      <Sidebar 
        role={role} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen w-full min-w-0 overflow-hidden bg-surface-container-lowest relative">
        
        {/* Mobile Header with Hamburger (Visible for all roles on mobile) */}
        <header className="md:hidden flex-none relative flex justify-between items-center px-2 py-2 bg-surface border-b border-border-default z-30 shadow-sm shrink-0 min-h-[56px]">
          {/* Left: Hamburger */}
            <div className="flex-1 flex justify-start">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 min-w-[48px] min-h-[48px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Open navigation menu"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            </div>
            
            {/* Center: Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-7 w-auto object-contain" />
            </div>

            <div className="flex-1 flex justify-end">
               <button className="p-2 min-w-[48px] min-h-[48px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>notifications</span>
              </button>
            </div>
          </header>

        {/* The Page Content */}
        <main className="flex-1 overflow-y-auto w-full relative z-10 pb-[90px] md:pb-0">
          {children}
        </main>
        
        {/* Bottom Navigation for Field Workers (Mobile only) */}
        {role === 'field-worker' && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border-default z-40 flex justify-around items-center h-[72px] px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
            {fieldWorkerLinks.map(link => (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] flex-1 py-1 rounded-xl transition-all duration-200 ${
                  isActive(link.path) 
                    ? 'text-primary bg-primary-container/20' 
                    : 'text-on-surface-variant hover:bg-surface-container-lowest'
                }`}
              >
                <div className={`flex items-center justify-center w-14 h-8 rounded-full mb-1 transition-colors ${isActive(link.path) ? 'bg-primary-container text-on-primary-container' : ''}`}>
                  <span 
                    className="material-symbols-outlined text-[24px]" 
                    style={{fontVariationSettings: isActive(link.path) ? "'FILL' 1" : "'FILL' 0"}}
                  >
                    {link.icon}
                  </span>
                </div>
                <span className={`text-[11px] font-medium tracking-wide ${isActive(link.path) ? 'text-on-surface font-bold' : ''}`}>
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};

export default AppLayout;
