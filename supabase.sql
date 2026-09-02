-- Spusť celý tento soubor v Supabase: SQL Editor → New query.
create table if not exists public.plan_settings (
  id boolean primary key default true check (id),
  mine_name text not null default 'Já',
  friend_name text not null default 'Kolega'
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  place text not null,
  title text not null,
  player text not null default 'open' check (player in ('mine', 'friend', 'open')),
  note text not null default '',
  unique (date, place, title)
);

create table if not exists public.editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.plan_settings enable row level security;
alter table public.events enable row level security;
alter table public.editors enable row level security;

create or replace function public.is_editor()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.editors where user_id = auth.uid());
$$;
grant execute on function public.is_editor() to anon, authenticated;

grant select on public.plan_settings, public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant update on public.plan_settings to authenticated;

drop policy if exists "public reads plan settings" on public.plan_settings;
drop policy if exists "editors update plan settings" on public.plan_settings;
drop policy if exists "public reads events" on public.events;
drop policy if exists "editors insert events" on public.events;
drop policy if exists "editors update events" on public.events;
drop policy if exists "editors delete events" on public.events;

create policy "public reads plan settings" on public.plan_settings for select using (true);
create policy "editors update plan settings" on public.plan_settings for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "public reads events" on public.events for select using (true);
create policy "editors insert events" on public.events for insert to authenticated with check (public.is_editor());
create policy "editors update events" on public.events for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editors delete events" on public.events for delete to authenticated using (public.is_editor());

insert into public.plan_settings (id, mine_name, friend_name) values (true, 'Já', 'Kolega') on conflict (id) do nothing;
insert into public.events (date, place, title) values
  ('2026-09-12', 'Most', 'Park Střed'),
  ('2027-01-08', 'Děčín', 'Ples města'),
  ('2027-01-23', 'Cvikov', 'Ples města'),
  ('2027-01-30', 'Děčín', 'Ples RYKO a.s.'),
  ('2027-02-05', 'Děčín', 'Zámecký ples'),
  ('2027-02-12', 'Březno u Chomutova', 'ples obce'),
  ('2027-02-26', 'Ústí nad Labem', 'maturitní ples (rezervace)'),
  ('2027-02-27', 'Rakovník', 'ples Procter & Gamble'),
  ('2027-03-06', 'Chlumec', 'ples města')
on conflict (date, place, title) do nothing;
