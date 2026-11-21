-- Ejecutar DESPUÉS de crear los 4 usuarios del personal en Supabase > Authentication > Users
-- (ver README, paso 3). Este script les asigna su rol.
insert into profiles (id, role, nombre, carrera, correo)
select id, 'coordinacion', 'Coordinación de Sistemas Computacionales', 'Ingeniería en Sistemas Computacionales', email
  from auth.users where email = 'coord.sistemas@demo.test'
union all
select id, 'coordinacion', 'Coordinación de Ingeniería Civil', 'Ingeniería Civil', email
  from auth.users where email = 'coord.civil@demo.test'
union all
select id, 'escolares', 'Servicios Escolares', null::text, email
  from auth.users where email = 'escolares@demo.test'
union all
select id, 'vinculacion', 'Gestión Tecnológica y Vinculación', null::text, email
  from auth.users where email = 'vinculacion@demo.test'
on conflict do nothing;
