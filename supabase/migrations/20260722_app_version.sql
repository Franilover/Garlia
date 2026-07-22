-- ─────────────────────────────────────────────────────────────────────────
-- Sistema de "hay actualización disponible" para el APK de Tauri/Android.
--
-- En vez de un latest.json suelto en Storage, usamos una tabla chica:
-- más fácil de actualizar desde el SQL editor o un script, y ya tenemos
-- el cliente de Supabase listo en la app para leerla (sin fetch extra a
-- Storage). El APK en sí SÍ vive en Storage (bucket `apks`, público).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.app_version (
  id integer primary key default 1,
  version text not null,        -- semver, ej "0.2.0" — debe matchear tauri.conf.json cuando se publique
  url text not null,             -- URL pública del .apk en el bucket `apks`
  notas text,                    -- changelog corto, opcional, se puede mostrar en el banner
  updated_at timestamptz not null default now(),
  constraint app_version_single_row check (id = 1) -- fuerza que solo exista una fila (la "última versión")
);

alter table public.app_version enable row level security;

-- Cualquiera (incluso anon) puede leer la versión actual — es información pública,
-- necesaria para que la app chequee actualizaciones sin estar logueada.
create policy "app_version: lectura pública"
  on public.app_version for select
  using (true);

-- Nadie puede escribir desde el cliente (anon/authenticated). Las actualizaciones
-- de esta fila se hacen a mano desde el SQL editor o con la service_role key
-- (ej. desde un script de release), nunca desde la app.
-- (No se crea policy de insert/update/delete → RLS las bloquea por default.)

-- Fila inicial, para que la tabla no esté vacía. Ajustá el valor a tu primera
-- versión "real" antes de generar el primer APK que vaya a chequear esto.
insert into public.app_version (id, version, url, notas)
values (1, '0.1.0', '', 'Primera versión con chequeo de actualizaciones.')
on conflict (id) do nothing;
