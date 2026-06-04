alter table public.categories
  add column if not exists is_archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

insert into public.categories (user_id, name, color)
select users.id, defaults.name, defaults.color
from auth.users users
cross join public.categories defaults
where defaults.user_id is null
  and not exists (
    select 1
    from public.categories existing
    where existing.user_id = users.id
      and lower(existing.name) = lower(defaults.name)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, user_id, full_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, color)
  select new.id, defaults.name, defaults.color
  from public.categories defaults
  where defaults.user_id is null
    and not exists (
      select 1
      from public.categories existing
      where existing.user_id = new.id
        and lower(existing.name) = lower(defaults.name)
    );

  return new;
end;
$$;

drop policy if exists "categories_select_own_or_defaults" on public.categories;
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);
