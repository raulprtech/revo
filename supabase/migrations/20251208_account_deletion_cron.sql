-- =====================================================
-- SUPABASE: Configuración para eliminación automática de cuentas
-- =====================================================
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- 1. Tabla para registrar las eliminaciones de cuentas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  deletion_requested_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  data_deleted JSONB DEFAULT '{}'::jsonb, -- {tournaments: N, events: N, participations: N}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios
COMMENT ON TABLE public.deletion_logs IS 'Registro de cuentas de usuario eliminadas';
COMMENT ON COLUMN public.deletion_logs.user_id IS 'ID del usuario eliminado';
COMMENT ON COLUMN public.deletion_logs.email IS 'Email del usuario (para referencia)';
COMMENT ON COLUMN public.deletion_logs.deletion_requested_at IS 'Fecha en que el usuario solicitó la eliminación';
COMMENT ON COLUMN public.deletion_logs.deleted_at IS 'Fecha en que se eliminó efectivamente la cuenta';
COMMENT ON COLUMN public.deletion_logs.data_deleted IS 'Resumen de datos eliminados (torneos, eventos, participaciones)';

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_at ON public.deletion_logs(deleted_at);

-- RLS: Solo admins pueden ver esta tabla
ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;

-- Política para que solo service_role pueda insertar
CREATE POLICY "Service role can insert deletion logs"
  ON public.deletion_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para que solo service_role pueda leer
CREATE POLICY "Service role can read deletion logs"
  ON public.deletion_logs
  FOR SELECT
  TO service_role
  USING (true);


-- 2. Función RPC para remover usuario de arrays de organizadores
-- =====================================================
CREATE OR REPLACE FUNCTION public.remove_user_from_organizers(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove from tournaments organizers array
  UPDATE public.tournaments
  SET organizers = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(organizers) AS elem
    WHERE elem::text != concat('"', user_email, '"')
  )
  WHERE organizers @> to_jsonb(user_email);
  
  -- Remove from events organizers array
  UPDATE public.events
  SET organizers = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(organizers) AS elem
    WHERE elem::text != concat('"', user_email, '"')
  )
  WHERE organizers @> to_jsonb(user_email);
  
  -- Remove from tournaments invited_users array
  UPDATE public.tournaments
  SET invited_users = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(invited_users) AS elem
    WHERE elem::text != concat('"', user_email, '"')
  )
  WHERE invited_users @> to_jsonb(user_email);
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.remove_user_from_organizers(TEXT) TO service_role;


-- 3. Habilitar extensión pg_cron (para programar la función)
-- =====================================================
-- Nota: Esto requiere permisos de superusuario, 
-- puede que necesites habilitarlo desde el Dashboard → Database → Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- 4. Habilitar extensión pg_net (para hacer HTTP requests)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_net;


-- 4. Programar la Edge Function para ejecutarse cada 6 horas
-- =====================================================
-- IMPORTANTE: Reemplaza YOUR_PROJECT_REF y YOUR_SERVICE_ROLE_KEY con tus valores reales
-- Puedes encontrarlos en: Settings → API

-- Primero eliminar el job si ya existe (para poder actualizarlo)
SELECT cron.unschedule('delete-expired-accounts') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'delete-expired-accounts'
);

-- Crear el job programado
-- Ejecuta cada 6 horas: 0 */6 * * *
-- Ejecuta diariamente a las 3am: 0 3 * * *
SELECT cron.schedule(
  'delete-expired-accounts',  -- Nombre del job
  '0 */6 * * *',               -- Cada 6 horas
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-expired-accounts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);


-- 5. Verificar que el job se creó correctamente
-- =====================================================
SELECT * FROM cron.job WHERE jobname = 'delete-expired-accounts';


-- 6. Ver historial de ejecuciones (después de que haya corrido)
-- =====================================================
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'delete-expired-accounts')
-- ORDER BY start_time DESC
-- LIMIT 10;


-- =====================================================
-- INSTRUCCIONES ADICIONALES
-- =====================================================
-- 
-- 1. Antes de ejecutar este script, ve a la sección 4 y reemplaza:
--    - YOUR_PROJECT_REF: El ID de tu proyecto (lo encuentras en Settings → General)
--    - YOUR_SERVICE_ROLE_KEY: La clave service_role (Settings → API → service_role key)
--
-- 2. Despliega la Edge Function:
--    supabase functions deploy delete-expired-accounts --no-verify-jwt
--
-- 3. Para probar manualmente:
--    supabase functions invoke delete-expired-accounts
--
-- 4. Para ver los logs de la función:
--    supabase functions logs delete-expired-accounts
