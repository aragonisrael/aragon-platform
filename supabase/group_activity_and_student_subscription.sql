-- Add group activity status and student subscription status
alter table if exists public.groups
  add column if not exists is_active boolean not null default true;

alter table if exists public.users
  add column if not exists subscription_status text not null default 'inactive';

-- Normalize existing student subscriptions according to their linked groups
update public.users u
set subscription_status = case
  when g.id is not null and g.is_active = true then 'active'
  else 'inactive'
end
from public.groups g
where u.role = 'student'
  and u.group_id = g.id;

update public.users
set subscription_status = 'inactive'
where role = 'student'
  and (group_id is null or subscription_status is null);

alter table if exists public.users
  drop constraint if exists users_subscription_status_check;

alter table if exists public.users
  add constraint users_subscription_status_check
  check (subscription_status in ('active', 'inactive'));

create or replace function public.sync_students_subscription_from_group()
returns trigger
language plpgsql
as $$
begin
  update public.users
  set subscription_status = case when new.is_active then 'active' else 'inactive' end
  where role = 'student'
    and group_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_students_subscription_from_group on public.groups;
create trigger trg_sync_students_subscription_from_group
after update of is_active on public.groups
for each row
execute function public.sync_students_subscription_from_group();

create or replace function public.sync_student_subscription_from_assignment()
returns trigger
language plpgsql
as $$
declare
  assigned_group_active boolean;
begin
  if new.role <> 'student' then
    return new;
  end if;

  if new.group_id is null then
    new.subscription_status := 'inactive';
    return new;
  end if;

  select coalesce(g.is_active, false)
  into assigned_group_active
  from public.groups g
  where g.id = new.group_id;

  new.subscription_status := case when assigned_group_active then 'active' else 'inactive' end;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_subscription_from_assignment on public.users;
create trigger trg_sync_student_subscription_from_assignment
before insert or update of group_id, role on public.users
for each row
execute function public.sync_student_subscription_from_assignment();
