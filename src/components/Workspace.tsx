import { type ReactNode, useEffect, useState } from 'react';
import { resolveProfile, useSessionProfile } from '../Session';
import { supabase } from '../supabaseClient';
import type { Profile } from '../types';
import Sidebar from './Sidebar';
export default function Workspace({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [user, setUser] = useState<Profile | null>(useSessionProfile());
  useEffect(() => {
    resolveProfile()
      .then(setUser)
      .catch(() => {});
  }, []);
  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        onSignOut={() => {
          void supabase.auth.signOut();
        }}
      />
      <main className="dashboard-main">
        <header className="page-header">
          <span className="eyebrow">YOUR EVERYDAY WORKSPACE</span>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{description}</p>
        </header>
        {children}
      </main>
    </div>
  );
}
