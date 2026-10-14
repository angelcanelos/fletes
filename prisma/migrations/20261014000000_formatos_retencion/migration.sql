-- Las extracciones ahora pueden llevar retención, igual que los fletes.
-- Por defecto 0 para que las extracciones ya guardadas no cambien su total.
ALTER TABLE "formatos" ADD COLUMN IF NOT EXISTS "retencion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Que la API de Supabase (PostgREST) vea la columna nueva de inmediato.
NOTIFY pgrst, 'reload schema';
