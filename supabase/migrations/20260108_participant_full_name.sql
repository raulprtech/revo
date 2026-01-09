-- Add full_name, birth_date, and gender columns to participants table
-- This stores additional user data for organizer verification

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Optional: Add comments to explain the column purposes
COMMENT ON COLUMN participants.full_name IS 'Full name of the participant for organizer verification (e.g., for checking payment records)';
COMMENT ON COLUMN participants.birth_date IS 'Birth date for age verification';
COMMENT ON COLUMN participants.gender IS 'Gender of the participant';
