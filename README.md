# Residencia Profesional · Inicio del trámite y seguimiento del residente

Aplicación web del reto integrador **«Automatiza tu Tec»** (Instituto Tecnológico de Matehuala · TecNM).
Cubre los pasos previos a la plataforma de Residencias: **registro de solicitud, pago y factura (simulados), constancia de avance, autorización de la coordinación y carta de presentación**, con seguimiento visible para el residente.

> Todos los datos son de prueba. No hay conexión con el banco, con Recursos Financieros ni se envían correos reales; los avisos se muestran dentro de la aplicación.

## Tecnología (una sola herramienta de programación)

| Pieza | Para qué sirve |
|---|---|
| **TypeScript + React (Vite)** | Toda la aplicación: pantallas, validaciones y generación de PDF. Es el único lenguaje de programación del proyecto. |
| **Supabase** (PostgreSQL + Auth) | Base de datos real compartida, inicio de sesión, roles y seguridad por fila. Las reglas del trámite están en `supabase/schema.sql`. |
| **pdf-lib** | Genera los PDF (factura, constancia y carta) con el logo del TecNM, en el navegador. |
| **GitHub Pages + GitHub Actions** | Publican el sitio con un enlace público cada vez que se sube un cambio a `main`. |

El SQL de `supabase/` es solo la definición de la base de datos (tablas y reglas); se pega una vez y no se vuelve a tocar.

## Estructura del proyecto

| Archivo | Función |
|---|---|
| `src/App.tsx` | Pantallas: acceso y creación de cuenta, vista del residente (5 pasos, pago, documentos, avisos) y vistas del personal (Coordinación, Servicios Escolares con alta de alumnos, Vinculación). |
| `src/lib.ts` | Conexión a Supabase, tipos de datos, días hábiles y traducción de errores a mensajes claros. |
| `src/pdf.ts` | Arma y descarga los PDF con logo, folio y sello de «simulado». |
| `src/styles.css` | Estilos: texto de 16 px, botones de 44 px, contraste alto, adaptable a celular y modo oscuro. |
| `public/tecnm-logo.png` | Logo del TecNM (único logo usado en la página y en los PDF). |
| `supabase/schema.sql` | Tablas, reglas de negocio, folios, bitácora, avisos y permisos por rol. |
| `supabase/staff.sql` | Asigna rol a los usuarios del personal. |
| `.github/workflows/deploy.yml` | Construye y publica el sitio en GitHub Pages. |
| `.env.example` | Plantilla de las dos claves de Supabase. |

## Roles (cada uno es un usuario distinto)

| Rol | Qué hace |
|---|---|
| Residente | Crea su cuenta, registra su solicitud, paga (simulado), ve su avance, descarga factura, constancia y carta. Solo ve su propio expediente. |
| Servicios Escolares | Da de alta a los alumnos (historial académico), valida el pago y emite la constancia con folio. |
| Coordinación de carrera | Ve solo las solicitudes de su carrera, con días hábiles sin cambio (resalta más de 3), y autoriza o rechaza con motivo. |
| Gestión Tecnológica y Vinculación | Emite la carta de presentación (solo con pago registrado y solicitud autorizada). |

## Puesta en marcha

1. **Crear el proyecto** gratis en [supabase.com](https://supabase.com).
2. **Base de datos:** SQL Editor → New query → pega todo `supabase/schema.sql` → Run.
3. **Usuarios del personal:** Authentication → Users → Add user → Create new user (marca *Auto Confirm User*) con los correos y contraseñas de la tabla de abajo. Luego pega y ejecuta `supabase/staff.sql`.
4. **Sin confirmación por correo:** Authentication → Sign In / Providers → Email → desactiva *Confirm email* (el nombre puede variar un poco según la versión del panel).
5. **Claves:** Project Settings → API → copia *Project URL* y la clave *anon public*.
6. **Probar en tu computadora:** `npm install`, copia `.env.example` como `.env` con tus dos claves y ejecuta `npm run dev`.
7. **Publicar con enlace público:** sube el proyecto a un repositorio de GitHub (rama `main`) → Settings → Secrets and variables → Actions → crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → Settings → Pages → Source: *GitHub Actions*. El enlace queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

La clave *anon* es pública por diseño; lo que protege los datos son las reglas de seguridad por fila de `schema.sql`. **Nunca subas la clave `service_role`.**

## Cuentas de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Coordinación de Sistemas | coord.sistemas@demo.test | Coord-Sis#2026 |
| Coordinación de Civil | coord.civil@demo.test | Coord-Civ#2026 |
| Servicios Escolares | escolares@demo.test | Escolares#2026 |
| Vinculación | vinculacion@demo.test | Vincula#2026 |

**Residentes de prueba:** en la pantalla de acceso elige *Soy residente y no tengo cuenta* y usa uno de estos controles con su correo `CONTROL@matehuala.tecnm.mx` y una contraseña propia (mínimo 8, letras y números):
`24000001` (cumple), `24000002` (cumple), `24000003` (no cumple: no puede registrar solicitud), `24000004` (Civil).
Para probar el **alta de alumnos**, entra como Servicios Escolares → pestaña *Alumnos*, da de alta un control nuevo y luego crea esa cuenta como residente.

## Flujo para la demostración

1. Residente: crea cuenta → registra solicitud → paga con la referencia que muestra el sistema → recibe factura.
2. Servicios Escolares: revisa y emite la constancia.
3. Coordinación: autoriza (o rechaza con motivo; el residente corrige y reenvía).
4. Vinculación: emite la carta.
5. Residente: descarga sus PDF desde *Documentos* y revisa *Avisos*.

## Validaciones (se aplican en pantalla y también en la base de datos)

| Dato | Regla |
|---|---|
| Número de control | 8 dígitos y dado de alta por Servicios Escolares |
| Correo | Institucional `@matehuala.tecnm.mx` |
| Contraseña | Mínimo 8 caracteres con letras y números |
| Requisitos (RN-01) | Servicio social, actividades complementarias, 80 % de créditos y sin curso especial; si falla alguno no se crea la solicitud |
| Proyecto | 10 a 120 caracteres |
| Referencia de pago | La vigente del trámite, a nombre del mismo control, con vigencia de 72 horas y renovable |
| Monto | Exactamente $100.00 (distingue pago incompleto y excedido) |
| Fecha del depósito | No futura ni anterior a la solicitud |
| Número de operación | 6 a 10 dígitos y no repetible |
| RFC | Formato de persona física con fecha válida |
| Cambios de estado | Solo el rol correspondiente y en el orden del proceso |
| Carta (RN-04) | Solo con pago registrado y solicitud autorizada |
| Rechazo | Motivo obligatorio (mínimo 10 caracteres) |

Cada cambio de estado queda en la bitácora con fecha, hora y persona (RNF-08) y genera un aviso al residente (RF-08).

## Limitaciones

- El pago, la factura y los avisos por correo son simulados; los PDF llevan sello de «simulado».
- Los PDF se generan al descargarlos a partir de los datos guardados.
- Un residente podría, con herramientas técnicas, editar campos de su propio trámite que no son el estado (por ejemplo la vigencia de la referencia). Los cambios de estado y los pagos sí están blindados.
- Los proyectos gratuitos de Supabase se pausan tras unos días sin uso: si la página no carga, entra al panel y presiona *Restore project*.
- Para agregar carreras, edita `CARRERAS` en `src/lib.ts` y crea la cuenta de su coordinación en `staff.sql`.

## Relación con el libro de la empresa

Implementa los requerimientos RF-01 a RF-10, RNF-01 a RNF-08 y las reglas RN-01 a RN-05 de la entrega E3. Respecto a E3, la plataforma pasa de Google Workspace (Apps Script y Hojas) a una base de datos Supabase: actualiza la sección 9.5 (herramientas) y la arquitectura de la sección 9.2 al entregar E4.
