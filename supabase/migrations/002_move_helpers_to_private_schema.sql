-- Keep internal helper functions out of the public Data API.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_teacher() set schema private;
alter function public.teaches_student(uuid) set schema private;
alter function public.is_class_member(uuid) set schema private;
alter function public.generate_join_code() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.handle_teacher_email_added() set schema private;
