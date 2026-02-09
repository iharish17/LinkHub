import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { PublicProfile } from './components/PublicProfile';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'auth' | 'dashboard' | 'profile'>('auth');
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/' || path === '') {
      setCurrentView(user ? 'dashboard' : 'auth');
    } else {
      const usernameFromPath = path.substring(1);
      setUsername(usernameFromPath);
      setCurrentView('profile');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (currentView === 'profile' && username) {
    return <PublicProfile username={username} />;
  }

  if (currentView === 'dashboard' && user) {
    return <Dashboard />;
  }

  return <Auth />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
