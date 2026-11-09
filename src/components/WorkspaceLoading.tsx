import Sidebar from './Sidebar';
import { supabase } from '../supabaseClient';
import type { Profile } from '../types';
export function LoadingContent() {
  return (
    <section className="workspace-loading" role="status" aria-label="Loading page content">
      <span className="eyebrow">YOUR WORKSPACE</span>
      <div className="loading-skeleton loading-title" />
      <div className="loading-skeleton loading-subtitle" />
      <div className="loading-card-grid">
        {[0, 1, 2].map((i) => (
          <div className="loading-skeleton loading-card" key={i} />
        ))}
      </div>
      <p>Loading your workspace…</p>
    </section>
  );
}
export default function WorkspaceLoading({
  user = null,
  error = '',
}: {
  user?: Profile | null;
  error?: string;
}) {
  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        onSignOut={() => {
          void supabase.auth.signOut();
        }}
      />
      <main className="dashboard-main">
        {error ? (
          <section className="notice" role="alert">
            <h2>Unable to open workspace</h2>
            <p>{error}</p>
            <a href="/login">Return to sign in</a>
          </section>
        ) : (
          <LoadingContent />
        )}
      </main>
    </div>
  );
}
