-- ─────────────────────────────────────────────────────────────────────────
-- Features: reacciones, doble check (usa columnas existentes), edición /
-- borrado de mensajes (usa columnas existentes: mensajes.editado, .eliminado),
-- push por mensaje nuevo.
-- Correr esto una vez en el SQL editor de Supabase (o via `supabase db push`
-- si migrás a un flujo de migraciones versionado).
-- ─────────────────────────────────────────────────────────────────────────

-- ── Reacciones con emoji ────────────────────────────────────────────────
create table if not exists public.mensaje_reacciones (
  id uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null references public.mensajes(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (mensaje_id, perfil_id, emoji) -- evita que el mismo usuario duplique la misma reacción
);

create index if not exists mensaje_reacciones_mensaje_id_idx
  on public.mensaje_reacciones (mensaje_id);

alter table public.mensaje_reacciones enable row level security;

-- Solo participantes de la conversación del mensaje pueden ver/agregar/sacar reacciones.
create policy "reacciones: ver si participo de la conversación"
  on public.mensaje_reacciones for select
  using (
    exists (
      select 1
      from public.mensajes m
      join public.conversacion_participantes cp on cp.conversacion_id = m.conversacion_id
      where m.id = mensaje_reacciones.mensaje_id
        and cp.perfil_id = auth.uid()
    )
  );

create policy "reacciones: agregar solo la propia, si participo"
  on public.mensaje_reacciones for insert
  with check (
    perfil_id = auth.uid()
    and exists (
      select 1
      from public.mensajes m
      join public.conversacion_participantes cp on cp.conversacion_id = m.conversacion_id
      where m.id = mensaje_reacciones.mensaje_id
        and cp.perfil_id = auth.uid()
    )
  );

create policy "reacciones: borrar solo la propia"
  on public.mensaje_reacciones for delete
  using (perfil_id = auth.uid());

-- ── Editar / eliminar mensaje propio ────────────────────────────────────
-- Las columnas `editado` y `eliminado` en `mensajes` ya existen. Solo hace
-- falta permitir el UPDATE vía RLS, restringido al propio remitente.
drop policy if exists "mensajes: editar/eliminar solo el propio" on public.mensajes;
create policy "mensajes: editar/eliminar solo el propio"
  on public.mensajes for update
  using (remitente_id = auth.uid())
  with check (remitente_id = auth.uid());

-- ── Push subscriptions por usuario (para notificar mensajes nuevos) ────
-- Distinta de `suscriptores` (que es una lista global/anónima para el
-- broadcast de "nuevo dibujo" del Atelier) — esta es por perfil, para poder
-- targetear al destinatario puntual de un mensaje.
create table if not exists public.perfil_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  endpoint text not null unique,
  subscription_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists perfil_push_subscriptions_perfil_id_idx
  on public.perfil_push_subscriptions (perfil_id);

alter table public.perfil_push_subscriptions enable row level security;

create policy "push subs: gestionar solo las propias"
  on public.perfil_push_subscriptions for all
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());
