-- Migration: Platform Tokenomics and Config
-- Description: Table for global platform settings controllable by admins

CREATE TABLE IF NOT EXISTS platform_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by TEXT -- Email of the admin who updated it
);

-- Seed initial values
INSERT INTO platform_configs (key, value) VALUES 
('duel_rake_percentage', '10'), -- 10% platform fee
('min_withdrawal_mxn', '200'), -- Minimum withdrawal amount
('dc_exchange_rate', '5'),     -- 1 MXN = 5 DC
('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_platform_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_update_platform_configs_timestamp
    BEFORE UPDATE ON platform_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_configs_timestamp();

-- RLS: Only admins can read/write
ALTER TABLE platform_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on platform_configs" 
ON platform_configs 
FOR ALL 
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' 
    OR auth.jwt() ->> 'email' = 'raul_vrm_2134@hotmail.com'
    OR auth.jwt() ->> 'email' = 'admin@duels.pro'
);

-- Function to get a config value easily
CREATE OR REPLACE FUNCTION get_platform_config(p_key TEXT)
RETURNS JSONB AS $$
    SELECT value FROM platform_configs WHERE key = p_key;
$$ LANGUAGE sql STABLE;
