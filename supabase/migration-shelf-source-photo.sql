-- Разрешить source photo_import (импорт с фото списка)
alter table shelf_items drop constraint if exists shelf_items_source_check;
alter table shelf_items add constraint shelf_items_source_check
  check (source in ('manual', 'selection', 'photo_import'));
