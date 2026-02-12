-- Seed default cosmetic items
INSERT INTO cosmetic_items (slug, name, description, category, price, image_preview, rarity, metadata, is_active)
VALUES 
  ('bottts_circuit', 'Circuit', 'Robot con circuitos integrados', 'avatar_collection', 20, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=circuit', 'common', '{"dicebear_style": "bottts-neutral", "seeds": ["circuit"]}', true),
  ('bottts_spark', 'Spark', 'Robot eléctrico y energético', 'avatar_collection', 20, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=spark', 'common', '{"dicebear_style": "bottts-neutral", "seeds": ["spark"]}', true),
  ('bottts_bolt', 'Bolt', 'Robot veloz como un rayo', 'avatar_collection', 20, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=bolt', 'common', '{"dicebear_style": "bottts-neutral", "seeds": ["bolt"]}', true),
  ('bottts_gear', 'Gear', 'Robot mecánico con engranajes', 'avatar_collection', 20, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=gear', 'common', '{"dicebear_style": "bottts-neutral", "seeds": ["gear"]}', true),
  ('bottts_neon', 'Neon', 'Robot con luces de neón', 'avatar_collection', 20, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=neon', 'rare', '{"dicebear_style": "bottts-neutral", "seeds": ["neon"]}', true),
  ('bottts_quantum', 'Quantum', 'Robot cuántico avanzado', 'avatar_collection', 20, 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=quantum', 'rare', '{"dicebear_style": "bottts-neutral", "seeds": ["quantum"]}', true),
  ('frame_golden', 'Marco Dorado', 'Un elegante borde dorado para tu avatar', 'bracket_frame', 100, NULL, 'common', '{"border_color": "#FFD700", "border_style": "solid", "border_width": 3, "glow": false}', true),
  ('frame_neon_blue', 'Neón Azul', 'Borde luminoso en tono azul eléctrico', 'bracket_frame', 150, NULL, 'rare', '{"border_color": "#00D4FF", "border_style": "solid", "border_width": 2, "glow": true, "glow_color": "#00D4FF"}', true),
  ('frame_fire', 'Marco de Fuego', 'Borde animado con efecto de llamas', 'bracket_frame', 300, NULL, 'epic', '{"border_color": "#FF4500", "border_style": "animated", "animation": "fire", "glow": true, "glow_color": "#FF6B00"}', true),
  ('frame_legendary', 'Marco Legendario', 'El máximo prestigio: borde arcoíris animado', 'bracket_frame', 500, NULL, 'legendary', '{"border_style": "animated", "animation": "rainbow", "glow": true, "gradient": ["#FF0000","#FF7F00","#FFFF00","#00FF00","#0000FF","#8B00FF"]}', true),
  ('banner_galaxy', 'Galaxia', 'Fondo de galaxia con estrellas', 'profile_banner', 350, NULL, 'legendary', '{"gradient": ["#0c0d13","#1a1a2e","#16213e","#0f3460"], "pattern": "stars", "animated": true}', true),
  ('banner_fire_gradient', 'Fuego Vivo', 'Gradiente de tonos cálidos y ardientes', 'profile_banner', 80, NULL, 'common', '{"gradient": ["#f12711", "#f5af19"], "pattern": "none"}', true),
  ('nick_gold', 'Nombre Dorado', 'Tu nickname brilla en dorado', 'nickname_color', 100, NULL, 'common', '{"color": "#FFD700", "gradient": false}', true),
  ('nick_rainbow', 'Nombre Arcoíris', 'Tu nickname con todos los colores', 'nickname_color', 400, NULL, 'legendary', '{"gradient": true, "animated": true, "colors": ["#FF0000","#FF7F00","#FFFF00","#00FF00","#0000FF","#8B00FF"]}', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  metadata = EXCLUDED.metadata;
