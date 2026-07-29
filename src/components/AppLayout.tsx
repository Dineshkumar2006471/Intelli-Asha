import { useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Determine role based on URL path
  const role = location.pathname.startsWith('/app') ? 'field-worker' : 'supervisor';

  return (
    <div className="min-h-screen bg-background-subtle flex overflow-hidden">
      {/* Sidebar - Handles both mobile drawer and desktop fixed mode */}
      <Sidebar 
        role={role} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen w-full min-w-0 overflow-hidden bg-surface-container-lowest relative">
        
        {/* Mobile Header with Hamburger (Only visible on small screens) */}
        <header className="md:hidden flex-none flex justify-between items-center px-4 py-3 bg-surface border-b border-border-default z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <img src="/logo-ia.png" alt="IntelliASHA Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2">
             {/* Notification Bell */}
             <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>notifications</span>
            </button>
          </div>
        </header>

        {/* The Page Content */}
        <main className="flex-1 overflow-y-auto w-full relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
