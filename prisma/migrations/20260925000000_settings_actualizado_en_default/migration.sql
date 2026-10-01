-- La app guarda los ajustes (catálogos, parajes, etc.) por la API de
-- Supabase, no por Prisma, y @updatedAt solo lo maneja Prisma en el
-- cliente: en la base la columna era NOT NULL sin valor por defecto, así
-- que cualquier upsert desde la app fallaba con
-- 'null value in column "actualizado_en" violates not-null constraint'.
ALTER TABLE "settings" ALTER COLUMN "actualizado_en" SET DEFAULT CURRENT_TIMESTAMP;

-- Igual que hacía @updatedAt: refrescar la fecha en cada modificación.
CREATE OR REPLACE FUNCTION settings_touch_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW."actualizado_en" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_touch_actualizado_en ON "settings";
CREATE TRIGGER settings_touch_actualizado_en
  BEFORE UPDATE ON "settings"
  FOR EACH ROW EXECUTE FUNCTION settings_touch_actualizado_en();
