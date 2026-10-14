-- POS Offline: Supabase database schema
-- Run this file in Supabase Dashboard > SQL Editor > New query.
-- RLS is enabled. The POS client must use Supabase Auth before production use.

create table if not exists public.shop_settings (
  id text primary key default 'default',
  store_name text not null default 'ร้านค้าของฉัน',
  store_address text not null default '',
  store_phone text not null default '',
  tax_id text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  sku text,
  category text not null default 'อื่น ๆ',
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  unit text not null default 'ชิ้น',
  icon text not null default '📦',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists products_sku_unique
  on public.products (sku)
  where sku is not null and sku <> '' and deleted_at is null;

create table if not exists public.sales (
  number text primary key,
  sale_date timestamptz not null default now(),
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  discount_percent numeric(7,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment text not null default 'เงินสด',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.pos_admins (
  username text primary key,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.shop_settings enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.pos_admins enable row level security;

drop policy if exists "authenticated can manage shop settings" on public.shop_settings;
create policy "authenticated can manage shop settings"
  on public.shop_settings for all to authenticated
  using (true) with check (true);

drop policy if exists "authenticated can manage products" on public.products;
create policy "authenticated can manage products"
  on public.products for all to authenticated
  using (true) with check (true);

drop policy if exists "authenticated can manage sales" on public.sales;
create policy "authenticated can manage sales"
  on public.sales for all to authenticated
  using (true) with check (true);

drop policy if exists "authenticated can manage admins" on public.pos_admins;
create policy "authenticated can manage admins"
  on public.pos_admins for all to authenticated
  using (true) with check (true);

insert into public.shop_settings (id)
values ('default')
on conflict (id) do nothing;
