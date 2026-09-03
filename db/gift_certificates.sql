-- Подарочные сертификаты reset.i11ume.com
-- Применено в Supabase 03.09.2026. Файл лежит в репозитории для истории:
-- по нему видно, что именно в базе, без захода в панель.

create table if not exists public.gift_certificates (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  product_id          text not null,
  product_title       text not null,
  amount_idr          integer not null check (amount_idr > 0),
  remaining_idr       integer not null check (remaining_idr >= 0),
  recipient_name      text not null,
  sender_name         text,
  message             text,
  status              text not null default 'active'
                        check (status in ('active','redeemed','void')),
  paid                boolean not null default false,
  paid_at             timestamptz,
  paid_note           text,
  created_at          timestamptz not null default now(),
  created_ip          text,
  expires_at          timestamptz not null,
  redeemed_at         timestamptz,
  redeemed_note       text,
  constraint remaining_not_over_amount check (remaining_idr <= amount_idr)
);

create index if not exists gift_certificates_created_at_idx
  on public.gift_certificates (created_at desc);
create index if not exists gift_certificates_status_idx
  on public.gift_certificates (status);

alter table public.gift_certificates enable row level security;

-- ВАЖНО. Таблица создана миграцией, а не через панель Supabase, поэтому
-- service_role остаётся без прав и получает permission denied. В панели это
-- не видно: RLS выглядит настроенным, а запись всё равно не проходит.
-- Та же грабля уже ловилась на таблице Донны и на rate_limits.
grant select, insert, update, delete on public.gift_certificates to service_role;

-- Счётчик обращений переиспользуется из существующей таблицы. Без прав
-- он недоступен, и рейт-лимит молча пропускает все запросы.
grant select, insert, update, delete on public.rate_limits to service_role;

-- Политик для anon нет намеренно: вся работа идёт service_role-ключом
-- из Netlify Functions. Проверено живым запросом — анонимный ключ
-- получает 401 и на чтение, и на запись.
