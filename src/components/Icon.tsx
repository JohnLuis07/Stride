import type { CSSProperties } from 'react';
const paths: Record<string, string> = {
  overview: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  notes: 'M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M9 15l1-4L19 2l3 3-9 9-4 1Z',
  calendar:
    'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  tasks: 'm8 6 2 2 4-4M4 7H3v14h14v-7M16 3h5v5M9 15h4',
  goals: 'M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 9-9m-5 0h5v5',
  focus: 'M9 2h6m-3 0v3m0 5v5l3 2M20 7l-2-2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  allowance: 'M3 7h18v13H3V5a2 2 0 0 1 2-2h13v4m-2 6h5v4h-5v-4Z',
  videos: 'M3 5h13v14H3V5Zm13 5 5-3v10l-5-3',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l1 3 3 1 3 2v4l-3 2-1 3-3 3h-4l-1-3-3-1-3-2v-4l3-2 1-3 3-3Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  logout: 'M9 3H4v18h5m5-5 5-4-5-4m-6 4h13',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
};
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      <path d={paths[name] || paths.overview} />
    </svg>
  );
}
