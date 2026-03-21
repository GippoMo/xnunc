-- ============================================================
-- xNunc — Schema Supabase
-- Eseguire nel SQL Editor di Supabase (una volta sola)
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  nome           text,
  cognome        text,
  studio_nome    text,
  ruolo          text not null default 'user' check (ruolo in ('admin','user')),
  is_blocked     boolean not null default false,
  key_mode       text not null default 'xnunc' check (key_mode in ('xnunc','byok')),
  ai_provider    text default 'anthropic' check (ai_provider in ('anthropic','openai','gemini')),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz
);

-- Trigger: crea automaticamente il profilo dopo la registrazione
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, ruolo)
  values (
    new.id,
    new.email,
    case when new.email = 'morales@bcand.it' then 'admin' else 'user' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── SKILLS (catalogo globale) ────────────────────────────────
create table if not exists public.skills (
  id           uuid primary key default uuid_generate_v4(),
  skill_id     text unique not null,
  area         text not null,
  sotto_area   text,
  nome         text not null,
  tipo         text default 'tool' check (tipo in ('tool','analisi','documento','wizard')),
  descrizione  text,
  input_atteso text,
  output_atteso text,
  normativa    text,
  tags         text[] default '{}',
  frequenza    text default 'ricorrente' check (frequenza in ('ricorrente','occasionale')),
  complessita  text default 'media' check (complessita in ('bassa','media','alta')),
  prompt       text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Trigger: aggiorna updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

-- ─── USER_SKILLS (skill personalizzate per utente) ─────────────
create table if not exists public.user_skills (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  base_skill_id  uuid references public.skills(id),
  nome           text not null,
  descrizione    text,
  prompt         text,
  agenti         text[] default '{}',
  docs_nomi      text[] default '{}',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger user_skills_updated_at
  before update on public.user_skills
  for each row execute function public.set_updated_at();

-- ─── AI_LOGS ─────────────────────────────────────────────────
create table if not exists public.ai_logs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id) on delete set null,
  skill_id     text,
  provider     text check (provider in ('anthropic','openai','gemini')),
  model        text,
  input_chars  integer,
  output_chars integer,
  duration_ms  integer,
  success      boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ─── THREADS (conversazioni) ──────────────────────────────────
create table if not exists public.threads (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  skill_id   text,
  titolo     text,
  messages   jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger threads_updated_at
  before update on public.threads
  for each row execute function public.set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;

create policy "Utente vede solo il proprio profilo"
  on public.profiles for select
  using (auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ruolo = 'admin'
  ));

create policy "Utente aggiorna solo il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Trigger inserisce profilo"
  on public.profiles for insert
  with check (true);

-- skills
alter table public.skills enable row level security;

create policy "Tutti vedono skill attive"
  on public.skills for select
  using (is_active = true or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ruolo = 'admin'
  ));

create policy "Solo admin gestisce skill catalog"
  on public.skills for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ruolo = 'admin'
  ));

-- user_skills
alter table public.user_skills enable row level security;

create policy "Utente vede le proprie skill"
  on public.user_skills for select
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ruolo = 'admin'
  ));

create policy "Utente gestisce le proprie skill"
  on public.user_skills for all
  using (user_id = auth.uid());

-- ai_logs
alter table public.ai_logs enable row level security;

create policy "Utente inserisce i propri log"
  on public.ai_logs for insert
  with check (user_id = auth.uid());

create policy "Utente vede i propri log"
  on public.ai_logs for select
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ruolo = 'admin'
  ));

-- threads
alter table public.threads enable row level security;

create policy "Utente gestisce i propri thread"
  on public.threads for all
  using (user_id = auth.uid());

-- ─── INDICI per performance ───────────────────────────────────
create index if not exists idx_user_skills_user_id on public.user_skills(user_id);
create index if not exists idx_ai_logs_user_id on public.ai_logs(user_id);
create index if not exists idx_ai_logs_created_at on public.ai_logs(created_at desc);
create index if not exists idx_threads_user_id on public.threads(user_id);
create index if not exists idx_skills_area on public.skills(area);
