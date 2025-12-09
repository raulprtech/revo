# Supabase Edge Functions Configuration

## delete-expired-accounts

Esta función elimina automáticamente las cuentas de usuario cuyo período de gracia de 7 días ha expirado.

### Requisitos

1. Supabase CLI instalado: `npm install -g supabase`
2. Proyecto de Supabase vinculado: `supabase link --project-ref YOUR_PROJECT_REF`

### Despliegue

```bash
# Desplegar la función
supabase functions deploy delete-expired-accounts --no-verify-jwt

# La opción --no-verify-jwt es necesaria para que funcione con cron jobs
```

### Programación (Cron Job)

Para que la función se ejecute automáticamente, necesitas configurar un cron job en Supabase:

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Database** → **Extensions** y habilita `pg_cron`
3. Ve a **SQL Editor** y ejecuta:

```sql
-- Crear la extensión pg_cron si no existe
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar la función para ejecutarse cada 6 horas
SELECT cron.schedule(
  'delete-expired-accounts',
  '0 */6 * * *',  -- Cada 6 horas
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-expired-accounts',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

### Variables de Entorno

La función utiliza automáticamente las siguientes variables de entorno de Supabase:
- `SUPABASE_URL`: URL de tu proyecto
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (con permisos de admin)

### Tabla de Logs (Opcional)

Si quieres mantener un registro de las cuentas eliminadas, crea esta tabla:

```sql
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  deletion_requested_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas
CREATE INDEX idx_deletion_logs_deleted_at ON deletion_logs(deleted_at);
```

### Testing Manual

Puedes probar la función manualmente:

```bash
# Con supabase CLI
supabase functions invoke delete-expired-accounts

# O con curl
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/delete-expired-accounts' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

### Respuesta de Ejemplo

```json
{
  "success": true,
  "timestamp": "2025-12-08T12:00:00.000Z",
  "totalUsersChecked": 150,
  "accountsDeleted": 2,
  "deletedAccounts": [
    {
      "userId": "abc-123",
      "email": "user@example.com",
      "deletionRequestedAt": "2025-12-01T10:00:00.000Z",
      "deletedAt": "2025-12-08T12:00:00.000Z"
    }
  ],
  "errors": []
}
```

### Seguridad

- La función requiere `SUPABASE_SERVICE_ROLE_KEY` para operar
- Solo puede ser invocada por el cron job de Supabase o manualmente con la clave de servicio
- Los logs de eliminación ayudan a auditar las eliminaciones
