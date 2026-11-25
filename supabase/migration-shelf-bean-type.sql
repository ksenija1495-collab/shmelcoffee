-- Вид кофе (арабика / либерика / robusta) — отдельно от сорта-культивара
alter table shelf_items add column if not exists bean_type text;
comment on column shelf_items.bean_type is 'arabica | liberica | robusta; null = arabica';