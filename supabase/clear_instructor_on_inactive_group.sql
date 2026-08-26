-- Inactive groups cannot stay (or become) assigned to an instructor.
-- Clears existing orphan assignments and enforces the rule on every write.

-- One-time cleanup: detach instructors from inactive groups
update public.groups
set instructor = '',
    status = 'red'
where is_active = false
  and coalesce(nullif(trim(instructor), ''), '') <> '';

create or replace function public.clear_instructor_when_group_inactive()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = false then
    new.instructor := '';
    new.status := 'red';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_instructor_when_group_inactive on public.groups;
create trigger trg_clear_instructor_when_group_inactive
before insert or update of is_active, instructor on public.groups
for each row
execute function public.clear_instructor_when_group_inactive();
