-- El Editor de Formatos guarda el diseño completo como documento JSON en
-- project_data (lo dibuja un renderizador de React), así que html/css ya
-- no son obligatorios: se dejan con valor por defecto vacío.
ALTER TABLE "plantillas_formato" ALTER COLUMN "html" SET DEFAULT '',
ALTER COLUMN "css" SET DEFAULT '';
