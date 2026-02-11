-- Add custom registration fields configuration to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_fields JSONB DEFAULT '[]'::jsonb;

-- Add custom responses to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS custom_responses JSONB DEFAULT '{}'::jsonb;

-- Add custom fields storage to profiles for "save to profile" feature
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tournaments.registration_fields IS 'Configuración de campos personalizados: [{label, type, required, options[], saveToProfile}]';
COMMENT ON COLUMN participants.custom_responses IS 'Respuestas a los campos personalizados del torneo: {label: value}';
COMMENT ON COLUMN profiles.saved_custom_fields IS 'Campos personalizados guardados por el usuario para autocompletado: {label: value}';
