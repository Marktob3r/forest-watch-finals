"use client";

import { useState, useEffect } from 'react';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import { Login } from '../components/Login';
import { Signup } from '../components/Signup';
import { Navigation } from '../components/Navigation';
import { Dashboard } from '../components/Dashboard';
import { Monitor } from '../components/Monitor';
import { ReportForm } from '../components/ReportForm';
import { Alerts } from '../components/Alerts';
import { Reforestation } from '../components/Reforestation';
import { Learn } from '../components/Learn';
import { Profile } from '../components/Profile';


export type Page = 'dashboard' | 'monitor' | 'report' | 'alerts' | 'reforestation' | 'learn' | 'profile';
type AuthPage = 'login' | 'signup';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    // Show persisted logout toast if set (set before a reload)
    try {
      const pending = typeof window !== 'undefined' ? sessionStorage.getItem('fw_toast') : null;
      if (pending === 'logged_out') {
        toast.success('You have been logged out');
        sessionStorage.removeItem('fw_toast');
      }
      const welcomeRaw = typeof window !== 'undefined' ? sessionStorage.getItem('fw_welcome') : null;
      if (welcomeRaw) {
        try {
          const parsed = JSON.parse(welcomeRaw);
          // Primary welcome toast first
          toast.success('Welcome back to Forest Watch!');
          // Then show personalized greeting shortly after (compute based on current local time)
          if (parsed?.name !== undefined) {
            const name = String(parsed.name || '').trim();
            const hour = new Date().getHours();
            const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
            const firstName = name ? name.split(' ').filter(Boolean)[0] : '';
            const greeting = `${timeOfDay}${firstName ? ', ' + firstName : ''}!`;
            setTimeout(() => {
              try { toast(greeting); } catch (e) {}
            }, 3500);
          }
        } catch (e) {
          // fallback
          toast.success('Welcome back to Forest Watch!');
        } finally {
          sessionStorage.removeItem('fw_welcome');
        }
      }
    } catch (e) {}

    // Check for token on mount and validate with /api/auth/me
    const token = typeof window !== 'undefined' ? localStorage.getItem('fw_token') : null;
    if (!token) return;

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('fw_token');
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        localStorage.removeItem('fw_token');
        setIsAuthenticated(false);
      });
  }, []);

  useEffect(() => {
    // When auth state becomes true, show any persisted welcome toast
    if (!isAuthenticated) return;
    try {
      const welcomeRaw = typeof window !== 'undefined' ? sessionStorage.getItem('fw_welcome') : null;
      if (welcomeRaw) {
        try {
          const parsed = JSON.parse(welcomeRaw);
          toast.success('Welcome back to Forest Watch!');
          if (parsed?.name !== undefined) {
            const name = String(parsed.name || '').trim();
            const hour = new Date().getHours();
            const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
            const firstName = name ? name.split(' ').filter(Boolean)[0] : '';
            const greeting = `${timeOfDay}${firstName ? ', ' + firstName : ''}!`;
            setTimeout(() => {
              try { toast(greeting); } catch (e) {}
            }, 3500);
          }
        } catch (e) {
          toast.success('Welcome back to Forest Watch!');
        } finally {
          sessionStorage.removeItem('fw_welcome');
        }
      }
    } catch (e) {}
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleSignup = () => {
    setIsAuthenticated(true);
  };

  // Show auth pages if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {authPage === 'login' ? (
          <Login
            onLogin={handleLogin}
            onSwitchToSignup={() => setAuthPage('signup')}
          />
        ) : (
          <Signup
            onSignup={handleSignup}
            onSwitchToLogin={() => setAuthPage('login')}
          />
        )}
        <Toaster />
      </div>
    );
  }

  // Show main app if authenticated
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'monitor':
        return <Monitor />;
      case 'report':
        return <ReportForm />;
      case 'alerts':
        return <Alerts />;
      case 'reforestation':
        return <Reforestation />;
      case 'learn':
        return <Learn />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="pb-20 md:pb-0 min-[1217px]:pt-16">
        {renderPage()}
      </main>
      <Toaster />
    </div>
  );
}