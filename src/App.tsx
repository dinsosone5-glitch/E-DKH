import React, { useState, useEffect } from 'react';
import { ASNUser } from './types';
import { getCurrentUser, setCurrentUser, getStoredUsers } from './services/storage';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { DashboardScreen } from './components/DashboardScreen';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<ASNUser | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserState(user);
    }
    setIsReady(true);
  }, []);

  const handleLoginSuccess = (user: ASNUser) => {
    setCurrentUserState(user);
    setCurrentUser(user);
  };

  const handleRegisterSuccess = (user: ASNUser) => {
    setCurrentUserState(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    setAuthView('login');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-emerald-300">Memuat Sistem E-DKH...</p>
        </div>
      </div>
    );
  }

  if (currentUser) {
    return (
      <DashboardScreen
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div>
      {authView === 'login' ? (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => setAuthView('register')}
        />
      ) : (
        <RegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateLogin={() => setAuthView('login')}
        />
      )}
    </div>
  );
}
