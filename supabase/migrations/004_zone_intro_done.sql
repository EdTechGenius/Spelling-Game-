-- Students must complete each zone's spelling-rule introduction before the other steps unlock.
alter table public.zone_progress add column intro_done boolean not null default false;
