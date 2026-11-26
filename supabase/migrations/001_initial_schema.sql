-- Spell Quests: initial schema
-- Roles: every user signs in (Microsoft or email). Anyone whose email is listed in
-- public.teacher_emails becomes a teacher; everyone else is a student.

-- ───────────────────────── Tables ─────────────────────────

create table public.teacher_emails (
  email text primary key check (email = lower(email))
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role         text not null default 'student' check (role in ('student', 'teacher')),
  year_group   int  check (year_group in (4, 5, 6)),
  avatar       jsonb not null default '{}'::jsonb,
  gems         int  not null default 0 check (gems >= 0),
  owned_items  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.generate_join_code()
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  animals text[] := array['FOX','OWL','ELK','BAT','EMU','YAK','APE','RAM','EEL','COD','HEN','DOE','JAY','KOI','LYNX','WOLF','BEAR','HAWK','MOLE','SEAL'];
  code text;
begin
  loop
    code := animals[1 + floor(random() * array_length(animals, 1))::int] || '-' || lpad((floor(random() * 1000))::int::text, 3, '0');
    exit when not exists (select 1 from public.classes c where c.join_code = code);
  end loop;
  return code;
end;
$$;

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  year_group  int  not null check (year_group in (4, 5, 6)),
  join_code   text not null unique,
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.classes alter column join_code set default public.generate_join_code();
create index classes_teacher_idx on public.classes (teacher_id);

create table public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student_idx on public.class_members (student_id);

create table public.zone_progress (
  student_id     uuid not null references public.profiles (id) on delete cascade,
  zone_key       text not null,             -- e.g. 'y4-01'
  learn_done     boolean not null default false,
  practise_count int not null default 0,
  best_stars     int not null default 0 check (best_stars between 0 and 3),
  check_done     boolean not null default false,
  updated_at     timestamptz not null default now(),
  primary key (student_id, zone_key)
);

create table public.notebook (
  student_id          uuid not null references public.profiles (id) on delete cascade,
  zone_key            text not null,
  word                text not null,
  status              text not null default 'pending' check (status in ('pending', 'mastered', 'tricky')),
  challenge_passed_at timestamptz,
  mastered_at         timestamptz,
  updated_at          timestamptz not null default now(),
  primary key (student_id, zone_key, word)
);

create table public.word_attempts (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  zone_key   text not null,
  word       text not null,
  typed      text not null default '',
  correct    boolean not null,
  activity   text not null default '',
  created_at timestamptz not null default now()
);
create index word_attempts_student_idx on public.word_attempts (student_id, created_at desc);

-- ───────────────────────── Helper functions ─────────────────────────

create or replace function public.is_teacher()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher');
$$;

create or replace function public.teaches_student(student uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    where cm.student_id = student and c.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.is_class_member(cls uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.class_members cm where cm.class_id = cls and cm.student_id = (select auth.uid()));
$$;

-- New sign-up → profile row (teacher if their email is on the list)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), ''),
      split_part(coalesce(new.email, 'Explorer'), '@', 1)
    ),
    case when exists (select 1 from public.teacher_emails t where t.email = lower(new.email)) then 'teacher' else 'student' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adding an email to teacher_emails later upgrades that existing account
create or replace function public.handle_teacher_email_added()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles p set role = 'teacher'
  from auth.users u
  where u.id = p.id and lower(u.email) = new.email;
  return new;
end;
$$;

create trigger on_teacher_email_added
  after insert on public.teacher_emails
  for each row execute function public.handle_teacher_email_added();

-- Students join a class with its code
create or replace function public.join_class(code text)
returns table (class_id uuid, class_name text, year_group int)
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.classes%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;
  select * into c from public.classes where join_code = upper(trim(code));
  if not found then
    raise exception 'That class code was not found';
  end if;
  insert into public.class_members (class_id, student_id)
  values (c.id, (select auth.uid()))
  on conflict do nothing;
  update public.profiles set year_group = c.year_group, updated_at = now()
  where id = (select auth.uid()) and role = 'student';
  return query select c.id, c.name, c.year_group;
end;
$$;

-- Gems: small, capped awards so a single call can't hand out a fortune
create or replace function public.add_gems(amount int)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  total int;
begin
  if amount < 0 or amount > 50 then
    raise exception 'Invalid gem amount';
  end if;
  update public.profiles set gems = gems + amount, updated_at = now()
  where id = (select auth.uid())
  returning gems into total;
  return total;
end;
$$;

create or replace function public.buy_item(item text, cost int)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  total int;
begin
  if cost < 0 then
    raise exception 'Invalid cost';
  end if;
  update public.profiles
     set gems = gems - cost,
         owned_items = array_append(owned_items, item),
         updated_at = now()
   where id = (select auth.uid())
     and gems >= cost
     and not (item = any (owned_items))
  returning gems into total;
  if total is null then
    raise exception 'Not enough gems, or item already owned';
  end if;
  return total;
end;
$$;

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.teacher_emails enable row level security;  -- no policies: managed from the dashboard only
alter table public.profiles       enable row level security;
alter table public.classes        enable row level security;
alter table public.class_members  enable row level security;
alter table public.zone_progress  enable row level security;
alter table public.notebook       enable row level security;
alter table public.word_attempts  enable row level security;

-- profiles
create policy "read own or my students' profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.teaches_student(id));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- classes
create policy "teachers see their classes, students see classes they're in" on public.classes
  for select to authenticated
  using (teacher_id = (select auth.uid()) or public.is_class_member(id));
create policy "teachers create classes" on public.classes
  for insert to authenticated
  with check (teacher_id = (select auth.uid()) and public.is_teacher());
create policy "teachers edit their classes" on public.classes
  for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "teachers delete their classes" on public.classes
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- class_members (students join via join_class())
create policy "see own memberships or my class lists" on public.class_members
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );
create policy "teachers remove students from their classes" on public.class_members
  for delete to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())));

-- zone_progress / notebook / word_attempts: students write their own; teachers read their students'
create policy "read own or my students' progress" on public.zone_progress
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_student(student_id));
create policy "write own progress" on public.zone_progress
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy "update own progress" on public.zone_progress
  for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "read own or my students' notebook" on public.notebook
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_student(student_id));
create policy "write own notebook" on public.notebook
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy "update own notebook" on public.notebook
  for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "read own or my students' attempts" on public.word_attempts
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_student(student_id));
create policy "write own attempts" on public.word_attempts
  for insert to authenticated with check (student_id = (select auth.uid()));

-- ───────────────────────── Grants (Data API) ─────────────────────────
-- Nothing is exposed to signed-out (anon) users.

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar, year_group, updated_at) on public.profiles to authenticated;

grant select, insert, update, delete on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant select, insert, update on public.zone_progress to authenticated;
grant select, insert, update on public.notebook to authenticated;
grant select, insert on public.word_attempts to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.add_gems(int) to authenticated;
grant execute on function public.buy_item(text, int) to authenticated;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.teaches_student(uuid) to authenticated;
grant execute on function public.is_class_member(uuid) to authenticated;
grant execute on function public.generate_join_code() to authenticated;
