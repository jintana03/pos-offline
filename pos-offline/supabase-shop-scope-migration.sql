-- POS Offline: shared login with separate shop projects.
-- Run after supabase-multi-shop-migration.sql in Supabase SQL Editor.
-- Existing admin users can access both shop projects; shop_key separates the data.

alter table public.shops add column if not exists shop_key text;
alter table public.shop_settings add column if not exists shop_key text;
alter table public.products add column if not exists shop_key text;
alter table public.sales add column if not exists shop_key text;

-- SKU may be reused by separate shops, but not duplicated within one shop.
drop index if exists public.products_sku_unique;
create unique index if not exists products_shop_sku_unique
  on public.products (shop_key, sku)
  where shop_key is not null and sku is not null and sku <> '' and deleted_at is null;

alter table public.shops alter column owner_id drop not null;
alter table public.shops drop constraint if exists shops_owner_id_key;

create unique index if not exists shops_shop_key_unique on public.shops (shop_key);
create unique index if not exists shop_settings_shop_key_unique on public.shop_settings (shop_key);

-- Preserve the two existing accounts shown in the current project.
update public.shops set shop_key = 'kitpaisan' where shop_key is null and owner_id = '4b1bb9e5-95bb-4333-93cf-f7245f87a985';
update public.shops set shop_key = 'kitmongkol' where shop_key is null and owner_id = '5ac74571-6646-4eb7-a542-14f25d41c324';
update public.shop_settings set shop_key = 'kitpaisan' where shop_key is null and owner_id = '4b1bb9e5-95bb-4333-93cf-f7245f87a985';
update public.shop_settings set shop_key = 'kitmongkol' where shop_key is null and owner_id = '5ac74571-6646-4eb7-a542-14f25d41c324';
update public.products set shop_key = 'kitpaisan' where shop_key is null and owner_id = '4b1bb9e5-95bb-4333-93cf-f7245f87a985';
update public.products set shop_key = 'kitmongkol' where shop_key is null and owner_id = '5ac74571-6646-4eb7-a542-14f25d41c324';
update public.sales set shop_key = 'kitpaisan' where shop_key is null and owner_id = '4b1bb9e5-95bb-4333-93cf-f7245f87a985';
update public.sales set shop_key = 'kitmongkol' where shop_key is null and owner_id = '5ac74571-6646-4eb7-a542-14f25d41c324';

-- Keep any remaining unassigned data in the first shop unless it was already assigned.
update public.shops set shop_key = 'kitpaisan' where shop_key is null;
update public.shop_settings set shop_key = 'kitpaisan' where shop_key is null;
update public.products set shop_key = 'kitpaisan' where shop_key is null;
update public.sales set shop_key = 'kitpaisan' where shop_key is null;

-- New rows created by older clients will default to the first shop until they are migrated.
alter table public.shops alter column shop_key set default 'kitpaisan';
alter table public.shop_settings alter column shop_key set default 'kitpaisan';
alter table public.products alter column shop_key set default 'kitpaisan';
alter table public.sales alter column shop_key set default 'kitpaisan';

drop policy if exists "authenticated can manage shops" on public.shops;
create policy "authenticated can manage shops"
  on public.shops for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "authenticated can manage shop settings" on public.shop_settings;
create policy "authenticated can manage shop settings"
  on public.shop_settings for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "authenticated can manage products" on public.products;
create policy "authenticated can manage products"
  on public.products for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "authenticated can manage sales" on public.sales;
create policy "authenticated can manage sales"
  on public.sales for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
