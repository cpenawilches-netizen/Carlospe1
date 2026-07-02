alter table categorias enable row level security;
alter table tipos_calzado enable row level security;
alter table productos enable row level security;

alter table productos
add column if not exists imagen_hover_url text;

drop policy if exists "Public read categorias" on categorias;
create policy "Public read categorias"
on categorias for select
using (activa = true);

drop policy if exists "Public read tipos_calzado" on tipos_calzado;
create policy "Public read tipos_calzado"
on tipos_calzado for select
using (activo = true);

drop policy if exists "Public read productos" on productos;
create policy "Public read productos"
on productos for select
using (disponible = true);

drop policy if exists "Authenticated read productos" on productos;
create policy "Authenticated read productos"
on productos for select
to authenticated
using (true);

drop policy if exists "Authenticated insert productos" on productos;
create policy "Authenticated insert productos"
on productos for insert
to authenticated
with check (true);

drop policy if exists "Authenticated update productos" on productos;
create policy "Authenticated update productos"
on productos for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated delete productos" on productos;
create policy "Authenticated delete productos"
on productos for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
on storage.objects for select
using (bucket_id = 'productos');

drop policy if exists "Authenticated upload product images" on storage.objects;
create policy "Authenticated upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'productos');

drop policy if exists "Authenticated update product images" on storage.objects;
create policy "Authenticated update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'productos')
with check (bucket_id = 'productos');
