-- Cria o evento GetUp 2026, já público, com as sessões I a V.
-- Rodar UMA vez no SQL Editor do Supabase (como postgres), DEPOIS da
-- migration 0007 do core (events.is_public). Pode rodar de novo sem duplicar.

with admin as (
  select id from public.profiles
   where role = 'admin' and is_active
   order by created_at
   limit 1
),
ev as (
  insert into public.events (name, slug, event_date, created_by, is_public)
  select 'GetUp 2026', 'getup-2026',
         date '2026-10-02',          -- primeiro dia do evento (02 a 04/10/2026)
         admin.id, true
    from admin
  on conflict (slug) do update set is_public = true
  returning id, created_by
)
insert into public.sessions (event_id, name, position, created_by)
select ev.id, s.name, s.position, ev.created_by
  from ev,
       (values ('Sessão I', 0), ('Sessão II', 1), ('Sessão III', 2), ('Sessão IV', 3), ('Sessão V', 4))
         as s(name, position)
on conflict (event_id, lower(btrim(name))) do nothing;

-- Conferência: deve devolver o evento e as cinco sessões, em ordem.
select * from public.public_event('getup-2026');
select name, position from public.public_event_sessions('getup-2026');
