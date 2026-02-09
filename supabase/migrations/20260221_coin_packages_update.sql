-- ============================================================================
-- Migration: Simplify coin packages to 3 options
-- Date: 2026-02-21
-- Description: Deactivates old 6 packages and inserts 3 new streamlined ones
-- ============================================================================

-- Step 1: Soft-delete all existing packages
UPDATE coin_packages SET is_active = false WHERE is_active = true;

-- Step 2: Insert 3 new packages
INSERT INTO coin_packages (slug, name, description, coin_amount, bonus_amount, price_mxn, is_featured, is_active) VALUES
  ('punado',      'Puñado',      'Ideal para probar la tienda',                      120,  0,    9.99,  false, true),
  ('cofre',       'Cofre',       'El favorito de la comunidad',                      500,  50,   39.99, true,  true),
  ('boveda-real', 'Bóveda Real', 'Máximo valor — desbloquea todo lo que quieras',   1500, 300,  99.99, false, true);
