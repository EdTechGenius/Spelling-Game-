-- Teachers choose which zones are open for their whole class, and which is the zone of the week.
alter table public.classes
  add column open_zones text[] not null default '{}',
  add column current_zone text;

-- New and existing classes start with zone 1 of their year open
create or replace function private.class_default_zones()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(array_length(new.open_zones, 1), 0) = 0 then
    new.open_zones := array['y' || new.year_group || '-01'];
  end if;
  if new.current_zone is null then
    new.current_zone := new.open_zones[array_length(new.open_zones, 1)];
  end if;
  return new;
end;
$$;

create trigger classes_default_zones
  before insert on public.classes
  for each row execute function private.class_default_zones();

update public.classes
   set open_zones = array['y' || year_group || '-01'],
       current_zone = 'y' || year_group || '-01'
 where coalesce(array_length(open_zones, 1), 0) = 0;
