-- ResiTrack · esquema relacional (probado en SQLite 3). Migrable a SQL Server cambiando
-- INTEGER PRIMARY KEY AUTOINCREMENT por INT IDENTITY(1,1) y TEXT por NVARCHAR (SIN PROBAR en SQL Server).
PRAGMA foreign_keys=ON;
CREATE TABLE usuarios(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario TEXT NOT NULL UNIQUE,nombre TEXT NOT NULL,
 rol TEXT NOT NULL CHECK(rol IN('residente','finanzas','escolares','coord','vinculacion')),carrera TEXT,salt TEXT NOT NULL,hash TEXT NOT NULL,intentos INTEGER DEFAULT 0,bloqueado_hasta INTEGER);
CREATE TABLE residentes(control TEXT PRIMARY KEY CHECK(length(control)=8),usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id),nombre TEXT NOT NULL,
 carrera TEXT NOT NULL CHECK(carrera IN('Ingeniería en Sistemas Computacionales','Ingeniería Civil','Ingeniería Industrial')),correo TEXT NOT NULL CHECK(correo LIKE '%.tecnm.mx'),
 creditos INTEGER CHECK(creditos BETWEEN 0 AND 100),servicio_social INTEGER,actividades INTEGER,curso_especial INTEGER);
CREATE TABLE solicitudes(id INTEGER PRIMARY KEY AUTOINCREMENT,control TEXT NOT NULL UNIQUE REFERENCES residentes(control),proyecto TEXT NOT NULL CHECK(length(proyecto) BETWEEN 10 AND 150),
 empresa TEXT NOT NULL,estado TEXT NOT NULL CHECK(estado IN('registrada','pagada','facturada','constancia','rechazada','autorizada','carta')),motivo_rechazo TEXT,creada INTEGER,actualizada INTEGER);
CREATE TABLE pagos(id INTEGER PRIMARY KEY AUTOINCREMENT,solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id),referencia TEXT NOT NULL UNIQUE CHECK(length(referencia)=14),
 monto NUMERIC NOT NULL CHECK(monto=100),vence INTEGER NOT NULL,estatus TEXT NOT NULL CHECK(estatus IN('pendiente','por_conciliar','aprobado','rechazado','vencido')),
 metodo TEXT CHECK(metodo IN('tarjeta','ficha')),operacion TEXT UNIQUE,autorizacion TEXT,intentos INTEGER DEFAULT 0 CHECK(intentos<=3));
CREATE TABLE fiscales(solicitud_id INTEGER PRIMARY KEY REFERENCES solicitudes(id),rfc TEXT NOT NULL CHECK(length(rfc)=13),nombre TEXT NOT NULL,cp TEXT NOT NULL CHECK(length(cp)=5),uso TEXT NOT NULL CHECK(uso IN('D10','S01')));
CREATE TABLE facturas(id INTEGER PRIMARY KEY AUTOINCREMENT,pago_id INTEGER NOT NULL UNIQUE REFERENCES pagos(id),uuid TEXT NOT NULL UNIQUE,serie_folio TEXT,total NUMERIC NOT NULL,sello TEXT,fecha INTEGER);
CREATE TABLE documentos(id INTEGER PRIMARY KEY AUTOINCREMENT,solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id),tipo TEXT NOT NULL CHECK(tipo IN('constancia','carta')),folio TEXT NOT NULL UNIQUE,hash TEXT NOT NULL,UNIQUE(solicitud_id,tipo));
CREATE TABLE bitacora(id INTEGER PRIMARY KEY AUTOINCREMENT,solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id),fecha INTEGER,usuario TEXT NOT NULL,rol TEXT NOT NULL,accion TEXT NOT NULL,detalle TEXT);
CREATE TABLE correos(id INTEGER PRIMARY KEY AUTOINCREMENT,usuario_id INTEGER NOT NULL REFERENCES usuarios(id),fecha INTEGER,asunto TEXT NOT NULL,cuerpo TEXT,leido INTEGER DEFAULT 0);
