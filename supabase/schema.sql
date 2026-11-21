-- =====================================================================
-- Residencia Profesional · ITM · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Las reglas del trámite viven aquí, en la base de datos, para que no se puedan saltar.
-- =====================================================================

-- ---------- Tablas ----------
create table historial_academico (            -- lo da de alta Servicios Escolares (RN-01)
  control text primary key check (control ~ '^\d{8}$'),
  nombre text not null,
  carrera text not null,
  servicio_social boolean not null default false,
  act_complementarias boolean not null default false,
  creditos_pct int not null check (creditos_pct between 0 and 100),
  curso_especial boolean not null default false
);

create table profiles (                        -- una fila por usuario de la plataforma
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('residente','coordinacion','escolares','vinculacion')),
  nombre text not null,
  control text unique references historial_academico(control),
  carrera text,
  correo text not null
);

create sequence s_sol; create sequence s_fac; create sequence s_con; create sequence s_car;

create table tramites (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null default 'SOL-' || lpad(nextval('s_sol')::text, 4, '0'),
  user_id uuid not null unique references profiles(id),   -- un trámite por residente
  control text not null,
  nombre text not null default '',
  carrera text not null default '',
  proyecto text not null check (char_length(proyecto) between 10 and 120),
  rfc text,
  estado text not null default 'Pago pendiente' check (estado in
    ('Pago pendiente','Pagada','Constancia emitida','Devuelta','Autorizada','Carta lista')),
  ref_num int not null default 1,
  referencia text not null default '',
  ref_expira timestamptz not null default now() + interval '72 hours',
  motivo text,
  created_at timestamptz not null default now()
);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  tramite_id uuid not null unique references tramites(id) on delete cascade,
  referencia text not null,
  monto numeric(10,2) not null check (monto = 100.00),
  operacion text not null unique check (operacion ~ '^\d{6,10}$'),
  fecha_deposito date not null,
  created_at timestamptz not null default now()
);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  tramite_id uuid not null references tramites(id) on delete cascade,
  tipo text not null check (tipo in ('factura','constancia','carta')),
  folio text unique not null default '',
  uuid_sim text,
  created_at timestamptz not null default now(),
  unique (tramite_id, tipo)
);

create table bitacora (                        -- RNF-08: quién cambió qué y cuándo
  id bigint generated always as identity primary key,
  tramite_id uuid references tramites(id) on delete cascade,
  estado text not null, actor text not null,
  created_at timestamptz not null default now()
);

create table avisos (                          -- RF-08: avisos al residente (simulados)
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  mensaje text not null,
  created_at timestamptz not null default now()
);

-- ---------- Funciones de apoyo ----------
create function my_role() returns text language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create function my_carrera() returns text language sql stable security definer set search_path = public
as $$ select carrera from profiles where id = auth.uid() $$;

-- ¿El control está dado de alta y todavía no tiene cuenta? (se usa al crear cuenta)
create function control_disponible(p_control text) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from historial_academico where control = p_control)
      and not exists (select 1 from profiles where control = p_control) $$;

-- ---------- Triggers ----------
-- Al crear cuenta: solo si el control existe en el historial y el correo es institucional
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into profiles (id, role, nombre, control, carrera, correo)
  select new.id, 'residente', h.nombre, h.control, h.carrera, new.email
  from historial_academico h
  where h.control = new.raw_user_meta_data->>'control'
    and lower(new.email) like '%@matehuala.tecnm.mx'
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Reglas del trámite: referencia, datos del historial y cambios de estado permitidos por rol
create function tramite_bi() returns trigger language plpgsql security definer set search_path = public
as $$
declare h historial_academico; r text := my_role();
begin
  if tg_op = 'INSERT' then
    select * into h from historial_academico where control = new.control;
    new.nombre := h.nombre; new.carrera := h.carrera;
  elsif new.estado <> old.estado then
    if not (
      (r = 'residente'    and old.estado = 'Pago pendiente'      and new.estado = 'Pagada') or
      (r = 'residente'    and old.estado = 'Devuelta'            and new.estado = 'Constancia emitida') or
      (r = 'escolares'    and old.estado = 'Pagada'              and new.estado = 'Constancia emitida') or
      (r = 'coordinacion' and old.estado = 'Constancia emitida'  and new.estado in ('Autorizada','Devuelta')) or
      (r = 'vinculacion'  and old.estado = 'Autorizada'          and new.estado = 'Carta lista')
    ) then raise exception 'Tu rol no puede hacer ese cambio de estado.'; end if;
    if new.estado = 'Devuelta' and char_length(coalesce(new.motivo, '')) < 10 then
      raise exception 'Escribe un motivo de al menos 10 caracteres.'; end if;
    if new.estado in ('Pagada','Carta lista')
       and not exists (select 1 from pagos where tramite_id = new.id) then
      raise exception 'No hay un pago registrado para este trámite.'; end if;   -- RN-04
  end if;
  new.referencia := 'RT-' || new.control || '-' || lpad(new.ref_num::text, 4, '0');
  return new;
end $$;
create trigger t_bi before insert or update on tramites for each row execute function tramite_bi();

-- Bitácora y avisos automáticos en cada cambio de estado
create function tramite_ai() returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if tg_op = 'INSERT' or new.estado <> old.estado then
    insert into bitacora (tramite_id, estado, actor)
      values (new.id, new.estado, coalesce((select nombre from profiles where id = auth.uid()), 'Sistema'));
    insert into avisos (user_id, mensaje) values (new.user_id, case new.estado
      when 'Pago pendiente'     then 'Solicitud ' || new.folio || ' registrada. Paga $100.00 con la referencia ' || new.referencia || '.'
      when 'Pagada'             then 'Pago registrado y factura simulada emitida. Servicios Escolares emitirá tu constancia.'
      when 'Constancia emitida' then 'Tu constancia de avance está lista y tu solicitud pasó a la coordinación de carrera.'
      when 'Autorizada'         then 'Tu solicitud fue autorizada. Vinculación emitirá tu carta de presentación.'
      when 'Devuelta'           then 'Tu solicitud fue devuelta. Motivo: ' || coalesce(new.motivo, '')
      else 'Tu carta de presentación está lista. Descárgala y sube tu reporte preliminar en la plataforma de Residencias.' end);
  end if;
  return null;
end $$;
create trigger t_ai after insert or update on tramites for each row execute function tramite_ai();

-- Folios generados por el servidor (consecutivos y sin repetirse)
create function doc_bi() returns trigger language plpgsql as $$
begin
  new.folio := case new.tipo
    when 'factura'    then 'FAC-SIM-'  || lpad(nextval('s_fac')::text, 4, '0')
    when 'constancia' then 'CAC-2026-' || lpad(nextval('s_con')::text, 4, '0')
    else                   'CP-2026-'  || lpad(nextval('s_car')::text, 4, '0') end;
  if new.tipo = 'factura' then new.uuid_sim := gen_random_uuid()::text; end if;
  return new;
end $$;
create trigger d_bi before insert on documentos for each row execute function doc_bi();

-- ---------- Operaciones con validación (RPC) ----------
-- Pago simulado + factura simulada, todo o nada (RF-03, RF-04)
create function registrar_pago(p_ref text, p_monto numeric, p_fecha date, p_op text, p_rfc text)
returns void language plpgsql security definer set search_path = public
as $$
declare t tramites; e text[] := '{}';
begin
  select * into t from tramites where user_id = auth.uid();
  if t.id is null then raise exception 'Primero registra tu solicitud.'; end if;
  if t.estado <> 'Pago pendiente' then raise exception 'Este trámite ya tiene el pago registrado.'; end if;
  if upper(trim(coalesce(p_ref, ''))) <> t.referencia then
    e := e || ('La referencia no coincide con la vigente de tu trámite (' || t.referencia || ').')::text; end if;
  if now() > t.ref_expira then e := e || 'La referencia venció (vigencia de 72 horas). Genera una nueva.'::text; end if;
  if p_monto is null or p_monto < 100 then e := e || 'Pago incompleto: el monto exacto es $100.00.'::text;
  elsif p_monto > 100 then e := e || 'El monto excede $100.00. Solo se acepta el monto exacto.'::text; end if;
  if p_fecha is null or p_fecha > current_date then e := e || 'La fecha del depósito no puede ser futura.'::text;
  elsif p_fecha < t.created_at::date then e := e || 'La fecha del depósito es anterior a tu solicitud.'::text; end if;
  if coalesce(p_op, '') !~ '^\d{6,10}$' then e := e || 'El número de operación debe tener de 6 a 10 dígitos.'::text;
  elsif exists (select 1 from pagos where operacion = p_op) then e := e || 'Ese número de operación ya fue registrado.'::text; end if;
  if upper(coalesce(p_rfc, '')) !~ '^[A-ZÑ&]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$' then
    e := e || 'El RFC no es válido (4 letras, fecha de 6 dígitos y 3 de homoclave).'::text; end if;
  if coalesce(array_length(e, 1), 0) > 0 then raise exception '%', array_to_string(e, '|'); end if;
  insert into pagos (tramite_id, referencia, monto, operacion, fecha_deposito)
    values (t.id, t.referencia, p_monto, p_op, p_fecha);
  insert into documentos (tramite_id, tipo) values (t.id, 'factura');
  update tramites set rfc = upper(p_rfc), estado = 'Pagada' where id = t.id;
end $$;

-- Emitir constancia (Servicios Escolares) o carta (Vinculación) con folio
create function emitir(p_tramite uuid, p_tipo text) returns void
language plpgsql security definer set search_path = public
as $$
declare t tramites; r text := my_role();
begin
  select * into t from tramites where id = p_tramite;
  if p_tipo = 'constancia' and r = 'escolares' and t.estado = 'Pagada' then
    insert into documentos (tramite_id, tipo) values (t.id, 'constancia');
    update tramites set estado = 'Constancia emitida' where id = t.id;
  elsif p_tipo = 'carta' and r = 'vinculacion' and t.estado = 'Autorizada' then
    insert into documentos (tramite_id, tipo) values (t.id, 'carta');
    update tramites set estado = 'Carta lista' where id = t.id;
  else raise exception 'No puedes emitir ese documento en el estado actual del trámite.'; end if;
end $$;

-- ---------- Seguridad por fila (RLS): cada rol solo ve lo suyo (RNF-06) ----------
alter table historial_academico enable row level security;
alter table profiles enable row level security;
alter table tramites enable row level security;
alter table pagos enable row level security;
alter table documentos enable row level security;
alter table bitacora enable row level security;
alter table avisos enable row level security;

create policy perfil_propio on profiles for select using (id = auth.uid());

create policy hist_ver on historial_academico for select
  using (my_role() = 'escolares' or control = (select control from profiles where id = auth.uid()));
create policy hist_alta on historial_academico for insert with check (my_role() = 'escolares');
create policy hist_edit on historial_academico for update using (my_role() = 'escolares');

create policy tram_ver on tramites for select using (
  user_id = auth.uid() or my_role() in ('escolares','vinculacion')
  or (my_role() = 'coordinacion' and carrera = my_carrera()));
create policy tram_edit on tramites for update using (
  user_id = auth.uid() or my_role() in ('escolares','vinculacion')
  or (my_role() = 'coordinacion' and carrera = my_carrera()));
create policy tram_alta on tramites for insert with check (            -- RN-01 se valida aquí
  user_id = auth.uid() and my_role() = 'residente'
  and control = (select control from profiles where id = auth.uid())
  and exists (select 1 from historial_academico h where h.control = tramites.control
              and h.servicio_social and h.act_complementarias and h.creditos_pct >= 80 and not h.curso_especial));

create policy pago_ver on pagos      for select using (exists (select 1 from tramites t where t.id = tramite_id));
create policy doc_ver  on documentos for select using (exists (select 1 from tramites t where t.id = tramite_id));
create policy bit_ver  on bitacora   for select using (exists (select 1 from tramites t where t.id = tramite_id));
create policy avi_ver  on avisos     for select using (user_id = auth.uid());

-- ---------- Alumnos de prueba (datos inventados, no reales) ----------
insert into historial_academico values
  ('24000001','Residente de prueba A','Ingeniería en Sistemas Computacionales', true, true, 88, false),
  ('24000002','Residente de prueba B','Ingeniería en Sistemas Computacionales', true, true, 91, false),
  ('24000003','Residente de prueba C','Ingeniería en Sistemas Computacionales', false, true, 62, false),
  ('24000004','Residente de prueba D','Ingeniería Civil', true, true, 84, false);
