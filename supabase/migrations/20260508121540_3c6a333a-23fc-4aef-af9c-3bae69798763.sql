
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country text default 'Nigeria',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- auto create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- resumes
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Resume',
  country text not null default 'Nigeria',
  target_role text,
  data jsonb not null default '{}'::jsonb,
  template text not null default 'classic',
  ats_score int,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "resumes_all_own" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index resumes_user_idx on public.resumes(user_id);

-- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  provider text not null check (provider in ('paystack','nomba')),
  reference text not null unique,
  amount_kobo int not null default 200000,
  currency text not null default 'NGN',
  email text not null,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);
create policy "payments_insert_own" on public.payments for insert with check (auth.uid() = user_id);
create policy "payments_update_own" on public.payments for update using (auth.uid() = user_id);

create index payments_user_idx on public.payments(user_id);

-- interview sessions
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  country text not null default 'Nigeria',
  difficulty text not null default 'medium',
  messages jsonb not null default '[]'::jsonb,
  score int,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_sessions enable row level security;

create policy "interviews_all_own" on public.interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger resumes_set_updated before update on public.resumes for each row execute function public.set_updated_at();
create trigger payments_set_updated before update on public.payments for each row execute function public.set_updated_at();
create trigger interviews_set_updated before update on public.interview_sessions for each row execute function public.set_updated_at();
