-- 1. Create the 'notes' table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text default 'Untitled Note',
  content text, -- Stores the rich text HTML (including base64 images)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. No RLS because we are using a manual database login system
alter table public.notes disable row level security;
