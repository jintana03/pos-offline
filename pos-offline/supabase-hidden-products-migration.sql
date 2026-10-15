-- Run once in Supabase SQL Editor to sync hidden products across devices.
alter table public.products
  add column if not exists is_hidden boolean not null default false;
