create table if not exists public.elgroup_demo_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.elgroup_demo_state enable row level security;

grant select, insert, update on table public.elgroup_demo_state to service_role;

comment on table public.elgroup_demo_state is
  'Single-row demo state store for the EL Group frontend. Accessed through the Vercel API only.';
