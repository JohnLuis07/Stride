import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
export default function DeadlineReminders() {
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let live = true;
    const seen = new Set<string>();
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.rpc('resolve_profile');
      if (!live || !profile?.id) return;
      const results = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', profile.id).neq('status', 'done'),
        supabase.from('goals').select('*').eq('user_id', profile.id),
      ]);
      for (const result of results)
        for (const row of result.data || []) {
          if (row.target_value && row.current_value >= row.target_value) continue;
          const at = Date.parse(row.deadline_at);
          const key = profile.id + row.id + row.deadline_at;
          if (!Number.isFinite(at) || at > Date.now() || Date.now() - at > 60000 || seen.has(key))
            continue;
          seen.add(key);
          if (live) setNotice('Deadline reached: ' + row.title);
          if (row.reminder_sound !== false) {
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
            audio.play().catch(() => {});
          }
          if ('Notification' in window && Notification.permission === 'granted')
            new Notification('Stride deadline', { body: row.title });
        }
    };
    const timer = setInterval(() => {
      check().catch(() => {});
    }, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  return notice ? (
    <div className="deadline-toast" role="status">
      {notice}
      <button onClick={() => setNotice('')}>Dismiss</button>
    </div>
  ) : null;
}
