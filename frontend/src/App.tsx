import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useState, useMemo, useEffect } from "react";

// Page Imports
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/ClientDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import CreateProjectWizard from "./pages/CreateProjectWizard";
import ProjectDetail from "./pages/ProjectDetail";
import DisputeChat from "./pages/DisputeChat";
import InvoicePreview from "./pages/InvoicePreview";
import JobBoard from "./pages/JobBoard";
import { useMyNotifications, useMarkNotificationRead } from "./api/useNotifications";

// Role-based auth guard wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole?: string }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole && user.role !== "ADMIN") return <Navigate to={`/${user.role.toLowerCase()}-dashboard`} replace />;
  return children;
};

// Mobile Menu Overlay Component
const MobileMenuOverlay = ({ 
  isOpen, 
  onClose, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-in-right">
        {children}
      </div>
    </div>
  );
};

// Navigation Content Component
const NavContent = ({ 
  isAuthenticated, 
  user, 
  notifications, 
  unreadCount, 
  onToggleNotifications,
  showNotifs,
  markRead,
  onClose,
  isMobile = false
}: {
  isAuthenticated: boolean;
  user: any;
  notifications: any[];
  unreadCount: number;
  onToggleNotifications: () => void;
  showNotifs: boolean;
  markRead: any;
  onClose?: () => void;
  isMobile?: boolean;
}) => {
  const logout = () => {
    useAuthStore.getState().logout();
    window.location.href = '/';
    onClose?.();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-500 to-emerald-600 bg-clip-text text-transparent">
          Trust-Bound
        </h1>
      </div>

      <div className="flex-1" />

      {isAuthenticated ? (
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3 p-4 bg-secondary-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold">
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.displayName}</p>
              <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
            </div>
          </div>

          {/* Notifications Toggle */}
          <button
            onClick={onToggleNotifications}
            className="w-full flex items-center justify-between p-4 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-text-primary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-brand-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div className="p-4 bg-white rounded-xl border border-secondary-200 max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-4">No notifications yet.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-3 bg-secondary-50 rounded-lg">
                      <div className="text-sm font-medium text-text-primary">{n.title}</div>
                      <div className="text-xs text-text-tertiary mt-1">{n.body}</div>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="text-xs text-brand-600 hover:text-brand-700 mt-2"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-4 text-sm font-medium text-danger-600 hover:bg-danger-50 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <a 
            href="/login" 
            className="block w-full text-center px-4 py-3 text-sm font-medium text-text-primary bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors"
            onClick={onClose}
          >
            Log in
          </a>
          <a 
            href="/register" 
            className="block w-full text-center px-4 py-3 text-sm font-medium text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
            onClick={onClose}
          >
            Get Started
          </a>
        </div>
      )}
    </>
  );
};

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { data: notifications = [] } = useMyNotifications(isAuthenticated);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const markRead = useMarkNotificationRead();
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle SPA-friendly unauthorized redirect from axios interceptor
  const navigate = useNavigate();
  useEffect(() => {
    const handleUnauthorized = () => {
      useAuthStore.getState().logout();
      navigate("/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [navigate]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Desktop Navigation */}
        <nav className="hidden lg:block border-b border-secondary-100 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-500 to-emerald-600 bg-clip-text text-transparent">
                  Trust-Bound
                </h1>
              </a>
              
              <div className="flex items-center gap-4">
                {isAuthenticated ? (
                  <>
                    <button
                      className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-secondary-100 rounded-lg transition-colors"
                      onClick={() => setShowNotifs((s) => !s)}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    
                    <div className="h-6 w-px bg-secondary-200" />
                    
                    <span className="text-sm text-text-secondary">{user?.displayName}</span>
                    
                    <span className="px-2.5 py-1 text-xs font-semibold bg-secondary-100 text-text-secondary rounded-full">
                      {user?.role}
                    </span>
                    
                    <button 
                      onClick={() => { useAuthStore.getState().logout(); window.location.href = '/'; }}
                      className="text-sm text-text-tertiary hover:text-danger-600 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <a href="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                      Log in
                    </a>
                    <a 
                      href="/register" 
                      className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
                    >
                      Get Started
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Desktop Notifications Dropdown */}
        {isAuthenticated && showNotifs && (
          <div className="hidden lg:block absolute right-4 top-16 w-80 bg-white rounded-xl border border-secondary-200 shadow-xl z-50 animate-fade-in">
            <div className="p-4 border-b border-secondary-100">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-8">No notifications yet.</p>
              ) : (
                <div className="p-2 space-y-1">
                  {notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className="p-3 rounded-lg hover:bg-secondary-50 transition-colors">
                      <div className="text-sm font-medium text-text-primary">{n.title}</div>
                      <div className="text-xs text-text-tertiary mt-1">{n.body}</div>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="text-xs text-brand-600 hover:text-brand-700 mt-2 font-medium"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        <nav className="lg:hidden border-b border-secondary-100 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="px-4">
            <div className="flex justify-between items-center h-14">
              <a href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-brand-500 to-emerald-600 bg-clip-text text-transparent">
                  Trust-Bound
                </span>
              </a>
              
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <button
                      className="relative p-2 text-text-secondary"
                      onClick={() => setShowNotifs((s) => !s)}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="p-2 text-text-secondary hover:bg-secondary-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <a 
                    href="/register" 
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-brand-500 rounded-lg"
                  >
                    Get Started
                  </a>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Notifications Panel */}
        {isAuthenticated && showNotifs && (
          <div className="lg:hidden border-b border-secondary-100 bg-white px-4 py-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              {notifications.length === 0 ? (
                <p className="text-xs text-text-tertiary">No notifications yet.</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="p-3 bg-secondary-50 rounded-lg">
                    <div className="text-sm font-medium text-text-primary">{n.title}</div>
                    <div className="text-xs text-text-tertiary mt-1">{n.body}</div>
                    {!n.isRead && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="text-xs text-brand-600 font-medium mt-2"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu Overlay */}
        <MobileMenuOverlay isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
              <NavContent 
                isAuthenticated={isAuthenticated}
                user={user}
                notifications={notifications}
                unreadCount={unreadCount}
                onToggleNotifications={() => setShowNotifs(!showNotifs)}
                showNotifs={showNotifs}
                markRead={markRead}
                isMobile
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-text-secondary hover:bg-secondary-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </MobileMenuOverlay>

        {/* Main Content */}
        <main className="flex-1 bg-gradient-to-br from-secondary-50 to-white text-foreground relative">
          <Routes>
            <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to={`/${user?.role.toLowerCase()}-dashboard`} replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/client-dashboard" element={<ProtectedRoute allowedRole="CLIENT"><ClientDashboard onMenuToggle={() => setMobileMenuOpen(true)} /></ProtectedRoute>} />
            <Route path="/freelancer-dashboard" element={<ProtectedRoute allowedRole="FREELANCER"><FreelancerDashboard onMenuToggle={() => setMobileMenuOpen(true)} /></ProtectedRoute>} />
            
            <Route path="/projects/new" element={<ProtectedRoute allowedRole="CLIENT"><CreateProjectWizard /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            
            <Route path="/projects/:projectId/dispute/:id" element={<ProtectedRoute><DisputeChat /></ProtectedRoute>} />
            <Route path="/projects/:projectId/invoice" element={<ProtectedRoute><InvoicePreview /></ProtectedRoute>} />
            <Route path="/job-board" element={<ProtectedRoute allowedRole="FREELANCER"><JobBoard /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
