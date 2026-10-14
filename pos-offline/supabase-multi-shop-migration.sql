-- Run after supabase-schema.sql.
-- One Supabase account owns one isolated shop.

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'ร้านค้าของฉัน',
  updated_at timestamptz not null default now()
);

alter table public.shop_settings add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.products add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.sales add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.pos_admins add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists shop_settings_owner_idx on public.shop_settings (owner_id);
create index if not exists products_owner_idx on public.products (owner_id);
create index if not exists sales_owner_idx on public.sales (owner_id);

alter table public.shops enable row level security;

drop policy if exists "authenticated can manage shops" on public.shops;
create policy "authenticated can manage shops"
  on public.shops for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "authenticated can manage shop settings" on public.shop_settings;
create policy "authenticated can manage shop settings"
  on public.shop_settings for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "authenticated can manage products" on public.products;
create policy "authenticated can manage products"
  on public.products for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "authenticated can manage sales" on public.sales;
create policy "authenticated can manage sales"
  on public.sales for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "authenticated can manage admins" on public.pos_admins;
create policy "authenticated can manage admins"
  on public.pos_admins for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
