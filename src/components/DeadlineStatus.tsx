import { useEffect, useState } from 'react';
export type DeadlineRecord = {
  deadline_at?: string;
  completed_at?: string;
  completed_deadline_at?: string;
  deadline_time?: string;
};
export default function DeadlineStatus({
  record,
  complete,
}: {
  record: DeadlineRecord;
  complete: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const deadline = record.deadline_at ? Date.parse(record.deadline_at) : NaN;
  const completion = record.completed_at ? Date.parse(record.completed_at) : NaN;
  const snapshot = record.completed_deadline_at ? Date.parse(record.completed_deadline_at) : NaN;
  const text = complete
    ? Number.isFinite(completion) && Number.isFinite(snapshot)
      ? completion <= snapshot
        ? 'Completed on time'
        : 'Completed late'
      : 'Completed · timing unavailable'
    : Number.isFinite(deadline) && now > deadline
      ? 'Overdue'
      : record.deadline_time
        ? 'Due at ' + record.deadline_time.slice(0, 5)
        : '';
  return text ? <span className="deadline-status">{text}</span> : null;
}
