-- El CHECK de settings.theme se había quedado atrás de la UI: solo
-- permitía ('midnight','mono','neon','ios','android','aurora','sunset'),
-- así que guardar cualquiera de los temas premium agregados después
-- (ocean, violet, ember, candy, forest) ya fallaba en la base aunque la
-- UI los mostrara como elegibles. Se amplía para cubrir todos los temas
-- que ya existen en GeneralView.tsx y se suma 'gold', el nuevo tema de
-- marca (oro/plata/negro).
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_theme_check;
ALTER TABLE settings ADD CONSTRAINT settings_theme_check
  CHECK (theme IN (
    'midnight', 'mono', 'neon', 'ios', 'android', 'aurora', 'sunset',
    'ocean', 'violet', 'ember', 'candy', 'forest', 'gold'
  ));
