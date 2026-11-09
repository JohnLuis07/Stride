import { useSessionProfile } from '../Session';
import { LoadingContent } from '../components/WorkspaceLoading';
import type { Profile as UserProfile } from '../types';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Icon from '../components/Icon';
import Sidebar from '../components/Sidebar';
import '../App.css';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(useSessionProfile());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const storedEmail = localStorage.getItem('userEmail');
      if (!storedEmail) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', storedEmail)
        .single();

      if (error || !data) {
        localStorage.removeItem('userEmail');
        navigate('/login');
      } else {
        setUser(data);
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const enabledFeatures = user?.features ?? ['Notes', 'Calendar', 'Todo', 'Goals', 'Focus'];

  const featureCards = [
    {
      id: 'Notes',
      name: 'Notes',
      icon: '📝',
      path: '/notes',
      description: 'Write and organize your thoughts.',
    },
    {
      id: 'Calendar',
      name: 'Calendar',
      icon: '📅',
      path: '/calendar',
      description: 'Schedule and manage your time.',
    },
    {
      id: 'Todo',
      name: 'Tasks',
      icon: '✅',
      path: '/todo',
      description: 'Keep track of your to-dos.',
    },
    {
      id: 'Goals',
      name: 'Goals',
      icon: '🎯',
      path: '/goals',
      description: 'Set and achieve your milestones.',
    },
    {
      id: 'Allowance',
      name: 'Budget & allowance',
      icon: '💳',
      path: '/allowance',
      description: 'Make your money last until payday.',
    },
    {
      id: 'generatevids',
      name: 'Video studio',
      icon: '🎬',
      path: '/videos',
      description: 'Turn an idea into a six-scene reel.',
    },
    {
      id: 'Focus',
      name: 'Focus',
      icon: '⏱️',
      path: '/focus',
      description: 'Master productivity with Pomodoro.',
    },
  ].filter((f) => enabledFeatures.includes(f.id));

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="dashboard-main">
        {loading ? (
          <LoadingContent />
        ) : (
          <>
            <header className="page-header">
              <span className="eyebrow">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
              <p className="page-subtitle">Here's what's happening in your workspace today.</p>
            </header>

            <section className="dashboard-welcome">
              <div>
                <span className="welcome-label">MAKE SPACE FOR WHAT MATTERS</span>
                <h2>A fresh day. A little momentum.</h2>
                <p>
                  Gather your ideas, make a plan, and find your focus. Your next small step starts
                  here.
                </p>
                <Link to="/focus">
                  Find your focus <Icon name="arrow" size={17} />
                </Link>
              </div>
              <div className="welcome-art" aria-hidden="true">
                <span>
                  <Icon name="focus" size={40} />
                </span>
              </div>
            </section>
            <div className="section-heading">
              <h2>Your workspace</h2>
              <Link to="/profile">Customize workspace</Link>
            </div>
            <section className="feature-grid">
              {featureCards.map((feature) => (
                <Link key={feature.id} to={feature.path} className="feature-item-card">
                  <div className="feature-icon-wrapper">
                    <Icon
                      name={
                        (
                          {
                            Notes: 'notes',
                            Calendar: 'calendar',
                            Todo: 'tasks',
                            Goals: 'goals',
                            Allowance: 'allowance',
                            generatevids: 'videos',
                            Focus: 'focus',
                          } as Record<string, string>
                        )[feature.id]
                      }
                      size={23}
                    />
                  </div>
                  <span className="card-arrow">
                    <Icon name="arrow" size={17} />
                  </span>
                  <div className="feature-content">
                    <h3>{feature.name}</h3>
                    <p>{feature.description}</p>
                  </div>
                </Link>
              ))}

              <Link
                to="/profile"
                className="feature-item-card"
                style={{ borderStyle: 'dashed', backgroundColor: 'transparent' }}
              >
                <div className="feature-icon-wrapper">
                  <Icon name="plus" size={23} />
                </div>
                <div className="feature-content">
                  <h3>Customize</h3>
                  <p>Add or remove features to fit your workflow.</p>
                </div>
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
