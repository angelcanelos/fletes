-- Se ejecuta DESPUÉS de que Prisma cree las tablas (prisma migrate dev),
-- porque Prisma no administra RLS ni la publicación de Realtime.
--
-- Modelo de acceso: cualquier usuario con sesión iniciada (login de
-- Supabase Auth) puede leer y escribir todo — es una sola oficina, no
-- hay dueños por fila. Sin sesión, la API de PostgREST no deja pasar
-- nada (RLS activado sin política para "anon" = acceso cero).

alter table formatos enable row level security;
alter table fletes enable row level security;
alter table settings enable row level security;

create policy "autenticados_formatos" on formatos
  for all to authenticated using (true) with check (true);

create policy "autenticados_fletes" on fletes
  for all to authenticated using (true) with check (true);

create policy "autenticados_settings" on settings
  for all to authenticated using (true) with check (true);

-- Tiempo real: sin esto, Supabase Realtime no manda los cambios de estas
-- tablas por WebSocket aunque el cliente esté suscrito.
alter publication supabase_realtime add table formatos;
alter publication supabase_realtime add table fletes;

alter table plantillas_formato enable row level security;

create policy "autenticados_plantillas_formato" on plantillas_formato
  for all to authenticated using (true) with check (true);

-- _prisma_migrations es la tabla que Prisma crea sola para llevar su
-- propio historial de migraciones; vive en "public" así que PostgREST
-- también la expone por la API a menos que se bloquee aquí. Nadie
-- necesita leerla ni escribirla desde la app, así que se activa RLS sin
-- ninguna política (acceso cero para "anon" y "authenticated"). Esto no
-- afecta a "prisma migrate": la CLI se conecta directo a Postgres con
-- DIRECT_URL como dueña de la tabla, y RLS no restringe al dueño.
alter table "_prisma_migrations" enable row level security;

-- Editor de Formatos: los cambios de diseño (y cuál está en uso) llegan
-- en vivo a las demás computadoras.
alter publication supabase_realtime add table plantillas_formato;
