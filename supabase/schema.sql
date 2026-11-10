-- Rulează o singură dată în Supabase > SQL Editor, într-un proiect nou.
-- Poveștile NU conțin user_id sau email.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  receipt_code uuid not null unique,
  category text not null check (category in ('antrenament','corp','alimentatie','intrebare','alta')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 40 and 10000),
  question text check (question is null or char_length(question) <= 1000),
  youtube_consent boolean not null default false,
  status text not null default 'noua' check (status in ('noua','citita','selectata','arhivata')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),
  constraint selected_requires_consent check (status <> 'selectata' or youtube_consent)
);

create index stories_created_at_idx on public.stories(created_at desc);
create index stories_status_idx on public.stories(status);

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.stories enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.admin_users from public, anon, authenticated;
revoke all on public.stories from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.stories to authenticated;
grant insert (receipt_code, category, title, body, question, youtube_consent) on public.stories to authenticated;
grant update (status, admin_notes) on public.stories to authenticated;
grant delete on public.stories to authenticated;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create policy "Read own profile or admin list"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Authenticated people may submit without identity link"
on public.stories for insert to authenticated
with check ((select auth.uid()) is not null);

create policy "Only admin reads stories"
on public.stories for select to authenticated
using ((select public.is_admin()));

create policy "Only admin organizes stories"
on public.stories for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Only admin removes stories directly"
on public.stories for delete to authenticated
using ((select public.is_admin()));

create or replace function public.sync_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

revoke all on function public.sync_profile() from public, anon, authenticated;

create trigger sync_profile_on_signup
after insert or update of email on auth.users
for each row execute function public.sync_profile();

-- Un cod lung și aleator permite autorului să șteargă povestea fără a salva identitatea lui.
create or replace function public.delete_story_by_receipt(p_code uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare removed_count integer;
begin
  if (select auth.uid()) is null then return false; end if;
  delete from public.stories where receipt_code = p_code;
  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

revoke all on function public.delete_story_by_receipt(uuid) from public, anon, authenticated;
grant execute on function public.delete_story_by_receipt(uuid) to authenticated;

-- După ce îți creezi și confirmi propriul cont, rulează SEPARAT:
-- insert into public.admin_users (user_id)
-- select id from auth.users where lower(email) = lower('EMAILUL_TAU');
