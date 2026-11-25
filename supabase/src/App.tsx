import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { sb, CONFIGURADO, CARRERAS, ROL, fd, diasHabiles, requisitos, mensajes } from './lib';
import type { Perfil, Tramite, Pago, Doc, Evento, Aviso, Historial, Estado } from './lib';
import { generarPdf, descargar } from './pdf';
import { Hero, Icono, Vacio, Bienvenida } from './ilustraciones';

const LOGO = import.meta.env.BASE_URL + 'tecnm-logo.png';
const PASOS: [string, Estado, string][] = [
  ['Solicitud registrada', 'Pago pendiente', 'doc'], ['Pago y factura', 'Pagada', 'bank'],
  ['Constancia de avance', 'Constancia emitida', 'receipt'], ['Autorización', 'Autorizada', 'check'],
  ['Carta de presentación', 'Carta lista', 'mail'],
];
const HECHOS: Record<Estado, number> = {
  'Pago pendiente': 1, 'Pagada': 2, 'Constancia emitida': 3, 'Devuelta': 3, 'Autorizada': 4, 'Carta lista': 5,
};
const SIGUIENTE: Record<Estado, string> = {
  'Pago pendiente': 'Siguiente: paga la constancia ($100.00)',
  'Pagada': 'Servicios Escolares revisa tu pago y emitirá tu constancia',
  'Constancia emitida': 'La coordinación de tu carrera está revisando tu solicitud',
  'Devuelta': 'Tu solicitud fue devuelta: corrígela y envíala de nuevo',
  'Autorizada': 'Vinculación está preparando tu carta de presentación',
  'Carta lista': 'Tu carta está lista. Ya puedes subir tu reporte preliminar',
};

const Errores = ({ l }: { l: string[] }) => l.length ? (
  <div className="err" role="alert"><b>Revisa esto antes de continuar:</b>
    <ul>{l.map(x => <li key={x}>{x}</li>)}</ul></div>
) : null;

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [sesion, setSesion] = useState(false);
  const [listo, setListo] = useState(false);

  const cargar = async () => {
    const { data: { session } } = await sb.auth.getSession();
    setSesion(!!session);
    if (!session) { setPerfil(null); setListo(true); return; }
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setPerfil(data as Perfil | null); setListo(true);
  };
  useEffect(() => {
    if (!CONFIGURADO) { setListo(true); return; }
    cargar();
    const { data } = sb.auth.onAuthStateChange(() => { setTimeout(cargar, 0); });
    return () => data.subscription.unsubscribe();
  }, []);

  let cuerpo;
  if (!CONFIGURADO) cuerpo = (
    <div className="card"><h2>Falta configurar la base de datos</h2>
      <p>Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>. Pasos en el README.</p></div>);
  else if (!listo) cuerpo = <p>Cargando…</p>;
  else if (!sesion) cuerpo = <Acceso />;
  else if (!perfil) cuerpo = (
    <div className="card"><h2>Tu cuenta aún no tiene un rol asignado</h2>
      <p>Pide a quien administra el sistema que la dé de alta.</p></div>);
  else cuerpo = perfil.role === 'residente' ? <Residente p={perfil} /> : <Staff p={perfil} />;

  return (<>
    <header>
      <img src={LOGO} alt="Logo del Tecnológico Nacional de México" />
      <div><h1>Residencia Profesional</h1><small>Instituto Tecnológico de Matehuala · TecNM</small></div>
      <span className="sp" />
      {perfil && <span>{perfil.nombre} · <b>{ROL[perfil.role]}</b></span>}
      {sesion && <button className="sec" onClick={() => sb.auth.signOut()}>Salir</button>}
    </header>
    <main>{cuerpo}</main>
    <footer>Prototipo con datos de prueba: el pago, la factura y los avisos son simulados.</footer>
  </>);
}

function Acceso() {
  const [modo, setModo] = useState<'in' | 'up'>('in');
  const [f, setF] = useState({ control: '', correo: '', pass: '', pass2: '' });
  const [errs, setErrs] = useState<string[]>([]);
  const [info, setInfo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const enviar = async (e: FormEvent) => {
    e.preventDefault(); setInfo(''); setOcupado(true);
    const correo = f.correo.trim().toLowerCase(), control = f.control.trim();
    if (modo === 'in') {
      if (!correo || !f.pass) setErrs(['Escribe tu correo y tu contraseña.']);
      else {
        const { error } = await sb.auth.signInWithPassword({ email: correo, password: f.pass });
        setErrs(error ? ['Correo o contraseña incorrectos.'] : []);
      }
    } else {
      const l: string[] = [];
      if (!/^\d{8}$/.test(control)) l.push('El número de control debe tener 8 dígitos.');
      if (!/^[^\s@]+@matehuala\.tecnm\.mx$/i.test(correo)) l.push('Usa tu correo institucional (@matehuala.tecnm.mx).');
      if (f.pass.length < 8 || !/\d/.test(f.pass) || !/[A-Za-z]/.test(f.pass)) l.push('La contraseña necesita al menos 8 caracteres, con letras y números.');
      if (f.pass !== f.pass2) l.push('Las contraseñas no coinciden.');
      if (!l.length) {
        const { data: ok } = await sb.rpc('control_disponible', { p_control: control });
        if (!ok) l.push('Ese número de control no está dado de alta por Servicios Escolares o ya tiene cuenta.');
      }
      if (l.length) setErrs(l);
      else {
        const { data, error } = await sb.auth.signUp({ email: correo, password: f.pass, options: { data: { control } } });
        if (error) setErrs(['No se pudo crear la cuenta: ' + error.message]);
        else { setErrs([]); setInfo(data.session ? 'Cuenta creada.' : 'Cuenta creada. Confirma tu correo e inicia sesión.'); }
      }
    }
    setOcupado(false);
  };

  return (
    <div className="grid">
      <div>
        <h2 style={{ fontSize: '2rem' }}>Inicia tu Residencia Profesional sin ir de oficina en oficina</h2>
        <p>Paga, recibe tu factura, tu constancia y tu carta, y mira en qué paso vas desde una sola pantalla.</p>
        <div className="route">{PASOS.map(([n, , i]) => <div key={n}><span><Icono n={i} /></span>{n}</div>)}</div>
        <p className="hint">Después sigues en la plataforma de Residencias con tu reporte preliminar.</p>
        <div className="chips"><span>Sin filas</span><span>Seguimiento en vivo</span><span>PDF con folio</span></div>
        <Hero />
      </div>
      <form className="card" onSubmit={enviar}>
        <h2>{modo === 'in' ? 'Entrar' : 'Crear cuenta de residente'}</h2>
        {modo === 'up' && <><label htmlFor="c">Número de control</label>
          <input id="c" inputMode="numeric" maxLength={8} value={f.control} onChange={set('control')} /></>}
        <label htmlFor="m">Correo {modo === 'up' ? 'institucional' : ''}</label>
        <input id="m" type="email" autoComplete="username" value={f.correo} onChange={set('correo')} />
        <label htmlFor="p">Contraseña</label>
        <input id="p" type="password" autoComplete={modo === 'in' ? 'current-password' : 'new-password'} value={f.pass} onChange={set('pass')} />
        {modo === 'up' && <><label htmlFor="p2">Repite la contraseña</label>
          <input id="p2" type="password" autoComplete="new-password" value={f.pass2} onChange={set('pass2')} /></>}
        <Errores l={errs} />{info && <div className="ok">{info}</div>}
        <div className="row"><button disabled={ocupado}>{modo === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
          <button type="button" className="sec" onClick={() => { setModo(modo === 'in' ? 'up' : 'in'); setErrs([]); setInfo(''); }}>
            {modo === 'in' ? 'Soy residente y no tengo cuenta' : 'Ya tengo cuenta'}</button></div>
        {modo === 'up' && <p className="hint">Tu número de control debe estar dado de alta por Servicios Escolares.</p>}
      </form>
    </div>
  );
}

function Linea({ t, ev }: { t: Tramite; ev: Evento[] }) {
  const hechos = HECHOS[t.estado];
  return (
    <ol className="steps">{PASOS.map(([n, e, ic], i) => {
      const cls = i < hechos ? 'done' : i === hechos ? (t.estado === 'Devuelta' ? 'ret' : 'cur') : '';
      const fecha = ev.find(x => x.estado === e)?.created_at;
      return <li key={n} className={cls}><span className="dot"><Icono n={ic} /></span>
        <div><b>{n}</b><div className="hint">{i < hechos && fecha ? fd(fecha) : i === hechos ? 'Paso actual' : 'Pendiente'}</div></div></li>;
    })}</ol>
  );
}

function Residente({ p }: { p: Perfil }) {
  const [tab, setTab] = useState<'t' | 'p' | 'd' | 'a'>('t');
  const [t, setT] = useState<Tramite | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [pago, setPago] = useState<Pago | null>(null);
  const [ev, setEv] = useState<Evento[]>([]);
  const [av, setAv] = useState<Aviso[]>([]);
  const [h, setH] = useState<Historial | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const [proy, setProy] = useState('');
  const [pg, setPg] = useState({ ref: '', monto: '', fecha: '', op: '', rfc: '' });

  const recargar = async () => {
    const { data: tr } = await sb.from('tramites').select('*').eq('user_id', p.id).maybeSingle();
    setT(tr as Tramite | null);
    const { data: hh } = await sb.from('historial_academico').select('*').eq('control', p.control).maybeSingle();
    setH(hh as Historial | null);
    const { data: a } = await sb.from('avisos').select('*').order('created_at', { ascending: false });
    setAv((a ?? []) as Aviso[]);
    if (tr) {
      const { data: d } = await sb.from('documentos').select('*').eq('tramite_id', tr.id);
      setDocs((d ?? []) as Doc[]);
      const { data: pa } = await sb.from('pagos').select('*').eq('tramite_id', tr.id).maybeSingle();
      setPago(pa as Pago | null);
      const { data: b } = await sb.from('bitacora').select('*').eq('tramite_id', tr.id).order('created_at');
      setEv((b ?? []) as Evento[]); setProy(tr.proyecto);
    } else { setDocs([]); setPago(null); setEv([]); }
  };
  useEffect(() => { recargar(); }, []);

  const validarProyecto = (): string[] => {
    const pr = proy.trim(), l: string[] = [];
    if (pr.length < 10 || pr.length > 120) l.push('El nombre del proyecto debe tener entre 10 y 120 caracteres.');
    if (!/^[\p{L}\d .,:;()\-/]+$/u.test(pr)) l.push('El proyecto solo admite letras, números y signos básicos.');
    return l;
  };
  const registrar = async (e: FormEvent) => {
    e.preventDefault();
    const l = validarProyecto();
    if (h && !requisitos(h).every(r => r[1])) l.push('Aún no cumples todos los requisitos para iniciar.');
    if (l.length) return setErrs(l);
    const { error } = await sb.from('tramites').insert({ user_id: p.id, control: p.control, proyecto: proy.trim() });
    if (error) setErrs(mensajes(error.message)); else { setErrs([]); recargar(); }
  };
  const pagar = async (e: FormEvent) => {
    e.preventDefault();
    const monto = Number(pg.monto.replace(/[$,\s]/g, ''));
    if (!pg.monto.trim() || Number.isNaN(monto)) return setErrs(['El monto debe ser un número, por ejemplo 100.00.']);
    const { error } = await sb.rpc('registrar_pago', { p_ref: pg.ref, p_monto: monto, p_fecha: pg.fecha || null, p_op: pg.op.trim(), p_rfc: pg.rfc.trim() });
    if (error) return setErrs(mensajes(error.message));
    setErrs([]); setTab('t'); recargar();
  };
  const nuevaRef = async () => {
    if (!t) return;
    const { error } = await sb.from('tramites').update({ ref_num: t.ref_num + 1, ref_expira: new Date(Date.now() + 72 * 3600e3).toISOString() }).eq('id', t.id);
    if (error) setErrs(mensajes(error.message)); else recargar();
  };
  const reenviar = async () => {
    if (!t) return;
    const l = validarProyecto(); if (l.length) return setErrs(l);
    const { error } = await sb.from('tramites').update({ proyecto: proy.trim(), estado: 'Constancia emitida', motivo: null }).eq('id', t.id);
    if (error) setErrs(mensajes(error.message)); else { setErrs([]); recargar(); }
  };
  const bajar = async (d: Doc) => { if (t) descargar(await generarPdf(d, t, pago ?? undefined, h), d.folio); };
  const setP = (k: keyof typeof pg) => (e: ChangeEvent<HTMLInputElement>) => setPg({ ...pg, [k]: e.target.value });
  const ir = (x: typeof tab) => { setTab(x); setErrs([]); };

  const tabs = (
    <div className="tabs">{([['t', 'Mi trámite'], ['d', 'Documentos'], ['a', 'Avisos']] as const).map(([k, n]) =>
      <button key={k} className={tab === k ? 'on' : ''} onClick={() => ir(k)}>{n}</button>)}</div>);

  if (tab === 'a') return <>{tabs}<div className="card"><h2>Avisos por correo (simulados)</h2>
    {av.map(a => <p key={a.id}><b>{fd(a.created_at)}</b><br />Para: {p.correo}<br />{a.mensaje}</p>)}
    {!av.length && <Vacio t="Aún no tienes avisos" />}</div></>;

  if (tab === 'd') return <>{tabs}<div className="card"><h2>Mi expediente</h2>
    {docs.length ? docs.map(d => <p key={d.id} className="docrow"><Icono n="doc" /> <b>{d.tipo === 'factura' ? 'Factura simulada' : d.tipo === 'constancia' ? 'Constancia de avance de carrera' : 'Carta de presentación'}</b> · {d.folio}{' '}
      <button className="sec" onClick={() => bajar(d)}>Descargar PDF</button></p>) : <Vacio t="Todavía no se emite ningún documento" />}</div></>;

  if (!t) {
    const rq = h ? requisitos(h) : [];
    const ok = rq.length > 0 && rq.every(r => r[1]);
    return <>{tabs}<Bienvenida nombre={p.nombre} hechos={0} /><form className="card" onSubmit={registrar}><h2>Registrar solicitud</h2>
      <p>El sistema revisa tus requisitos con tu historial académico: no hace falta ir a ninguna oficina.</p>
      <label>Nombre</label><input value={p.nombre} readOnly />
      <label>Número de control</label><input value={p.control ?? ''} readOnly />
      <label>Carrera</label><input value={p.carrera ?? ''} readOnly />
      <label htmlFor="pr">Nombre de tu proyecto de residencia</label>
      <input id="pr" maxLength={120} value={proy} onChange={e => setProy(e.target.value)} placeholder="Ejemplo: Sistema de inventario para un taller" />
      <h3>Tus requisitos</h3>
      <ul className="chk">{rq.map(([n, c]) => <li key={n} className={c ? '' : 'no'}>{n}</li>)}</ul>
      {!ok && <div className="err">No puedes registrar la solicitud hasta cumplir todos los requisitos.</div>}
      <Errores l={errs} /><div className="row"><button disabled={!ok}>Registrar solicitud</button></div></form></>;
  }

  if (tab === 'p' && t.estado === 'Pago pendiente') {
    const vencida = Date.now() > new Date(t.ref_expira).getTime();
    return <>{tabs}<form className="card" onSubmit={pagar}><h2>Pago de la constancia</h2>
      <table><tbody>
        <tr><th>Concepto</th><td>Constancia de avance de carrera</td></tr>
        <tr><th>Monto</th><td><b>$100.00 MXN</b></td></tr>
        <tr><th>Referencia</th><td><b>{t.referencia}</b> {vencida ? <span className="tag late">Vencida</span> : <span className="hint">vence {fd(t.ref_expira)}</span>}</td></tr>
        <tr><th>Banco</th><td>BBVA (simulado)</td></tr></tbody></table>
      {vencida && <div className="row"><button type="button" onClick={nuevaRef}>Generar nueva referencia</button></div>}
      <h3>Registrar el depósito</h3><p className="hint">Copia los datos de tu comprobante. Es una simulación: no se hace ningún cobro.</p>
      <label htmlFor="r">Referencia del comprobante</label><input id="r" value={pg.ref} onChange={setP('ref')} autoComplete="off" />
      <label htmlFor="mo">Monto pagado (MXN)</label><input id="mo" inputMode="decimal" placeholder="100.00" value={pg.monto} onChange={setP('monto')} />
      <label htmlFor="fe">Fecha del depósito</label><input id="fe" type="date" value={pg.fecha} onChange={setP('fecha')} />
      <label htmlFor="op">Número de operación (6 a 10 dígitos)</label><input id="op" inputMode="numeric" value={pg.op} onChange={setP('op')} />
      <h3>Datos para la factura</h3>
      <label htmlFor="rf">RFC (persona física)</label><input id="rf" maxLength={13} placeholder="DEMO010101AB1" value={pg.rfc} onChange={setP('rfc')} />
      <label>Nombre</label><input value={p.nombre} readOnly /><label>Correo institucional</label><input value={p.correo} readOnly />
      <Errores l={errs} />
      <div className="row"><button>Registrar pago y emitir factura</button><button type="button" className="sec" onClick={() => ir('t')}>Volver</button></div></form></>;
  }

  return <>{tabs}
    <Bienvenida nombre={p.nombre} hechos={HECHOS[t.estado]} />
    <div className="card next"><h2>{SIGUIENTE[t.estado]}</h2>
      {t.estado === 'Pago pendiente' && <button onClick={() => ir('p')}>Ir al pago</button>}
      {t.estado === 'Devuelta' && <><p><b>Motivo:</b> {t.motivo}</p>
        <label htmlFor="pr2">Proyecto corregido</label><input id="pr2" maxLength={120} value={proy} onChange={e => setProy(e.target.value)} />
        <Errores l={errs} /><div className="row"><button onClick={reenviar}>Enviar de nuevo</button></div></>}
      {t.estado === 'Carta lista' && <p className="hint">Descarga tu carta en la pestaña Documentos y continúa en la plataforma de Residencias del Intranet con tu reporte preliminar.</p>}
    </div>
    <div className="card"><h2>Tus 5 pasos · {t.folio}</h2><Linea t={t} ev={ev} /></div></>;
}

function Staff({ p }: { p: Perfil }) {
  const r = p.role;
  const pend: Estado = r === 'escolares' ? 'Pagada' : r === 'vinculacion' ? 'Autorizada' : 'Constancia emitida';
  const tipoDoc = r === 'vinculacion' ? 'carta' : 'constancia';
  const vacio = { control: '', nombre: '', carrera: CARRERAS[0], ss: false, ac: false, cr: '', esp: false };
  const [tab, setTab] = useState<'b' | 'a'>('b');
  const [ts, setTs] = useState<Tramite[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ev, setEv] = useState<Evento[]>([]);
  const [his, setHis] = useState<Historial[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [al, setAl] = useState(vacio);
  const [errs, setErrs] = useState<string[]>([]);
  const [ok, setOk] = useState('');

  const recargar = async () => {
    const q = async (tabla: string, orden?: string) => {
      const x = sb.from(tabla).select('*'); const { data } = orden ? await x.order(orden, { ascending: false }) : await x; return data ?? [];
    };
    setTs((await q('tramites', 'created_at')) as Tramite[]); setDocs((await q('documentos')) as Doc[]);
    setPagos((await q('pagos')) as Pago[]); setEv((await q('bitacora', 'created_at')) as Evento[]);
    if (r === 'escolares') setHis((await q('historial_academico', 'control')) as Historial[]);
  };
  useEffect(() => { recargar(); }, []);

  const emitir = async (t: Tramite) => {
    const { error } = await sb.rpc('emitir', { p_tramite: t.id, p_tipo: tipoDoc });
    if (error) setErrs(mensajes(error.message)); else { setErrs([]); setSel(null); recargar(); }
  };
  const decidir = async (t: Tramite, aut: boolean) => {
    if (!aut && motivo.trim().length < 10) return setErrs(['Para rechazar escribe un motivo de al menos 10 caracteres.']);
    const { error } = await sb.from('tramites').update(aut ? { estado: 'Autorizada', motivo: null } : { estado: 'Devuelta', motivo: motivo.trim() }).eq('id', t.id);
    if (error) setErrs(mensajes(error.message)); else { setErrs([]); setSel(null); setMotivo(''); recargar(); }
  };
  const bajar = async (t: Tramite, d: Doc) =>
    descargar(await generarPdf(d, t, pagos.find(x => x.tramite_id === t.id), his.find(x => x.control === t.control)), d.folio);
  const guardarAlumno = async (e: FormEvent) => {
    e.preventDefault(); setOk('');
    const l: string[] = [], cr = Number(al.cr);
    if (!/^\d{8}$/.test(al.control)) l.push('El número de control debe tener 8 dígitos.');
    if (al.nombre.trim().length < 5) l.push('Escribe el nombre completo del alumno.');
    if (al.cr === '' || !Number.isInteger(cr) || cr < 0 || cr > 100) l.push('El porcentaje de créditos debe ser un entero entre 0 y 100.');
    if (l.length) return setErrs(l);
    const { error } = await sb.from('historial_academico').upsert({ control: al.control, nombre: al.nombre.trim(), carrera: al.carrera,
      servicio_social: al.ss, act_complementarias: al.ac, creditos_pct: cr, curso_especial: al.esp });
    if (error) return setErrs(mensajes(error.message));
    setErrs([]); setOk('Alumno guardado. Ya puede crear su cuenta de residente.'); setAl(vacio); recargar();
  };

  const nPend = ts.filter(x => x.estado === pend).length, nOk = ts.filter(x => x.estado === 'Carta lista').length;
  const nLate = ts.filter(x => x.estado !== 'Carta lista' && diasHabiles(ev.find(e => e.tramite_id === x.id)?.created_at ?? x.created_at) > 3).length;
  const t = ts.find(x => x.id === sel);
  const titulo = r === 'coordinacion' ? 'Solicitudes de tu carrera' : r === 'escolares' ? 'Pagos por validar y constancias por emitir' : 'Cartas por emitir';
  const tabs = r === 'escolares' && (
    <div className="tabs"><button className={tab === 'b' ? 'on' : ''} onClick={() => setTab('b')}>Trámites</button>
      <button className={tab === 'a' ? 'on' : ''} onClick={() => setTab('a')}>Alumnos</button></div>);

  if (tab === 'a') return <>{tabs}
    <form className="card" onSubmit={guardarAlumno}><h2>Dar de alta o actualizar alumno</h2>
      <p className="hint">Es el historial académico que el sistema usa para verificar los requisitos. Después el alumno crea su cuenta.</p>
      <label htmlFor="ac">Número de control</label><input id="ac" inputMode="numeric" maxLength={8} value={al.control} onChange={e => setAl({ ...al, control: e.target.value })} />
      <label htmlFor="an">Nombre completo</label><input id="an" value={al.nombre} onChange={e => setAl({ ...al, nombre: e.target.value })} />
      <label htmlFor="ar">Carrera</label><select id="ar" value={al.carrera} onChange={e => setAl({ ...al, carrera: e.target.value })}>{CARRERAS.map(c => <option key={c}>{c}</option>)}</select>
      <label htmlFor="acr">Créditos cursados (%)</label><input id="acr" inputMode="numeric" value={al.cr} onChange={e => setAl({ ...al, cr: e.target.value })} />
      <label><input type="checkbox" checked={al.ss} onChange={e => setAl({ ...al, ss: e.target.checked })} />Servicio social acreditado</label>
      <label><input type="checkbox" checked={al.ac} onChange={e => setAl({ ...al, ac: e.target.checked })} />Actividades complementarias acreditadas</label>
      <label><input type="checkbox" checked={al.esp} onChange={e => setAl({ ...al, esp: e.target.checked })} />Tiene asignatura en curso especial</label>
      <Errores l={errs} />{ok && <div className="ok">{ok}</div>}<div className="row"><button>Guardar alumno</button></div></form>
    <div className="card"><h3>Alumnos dados de alta</h3><div className="tw"><table><thead><tr><th>Control</th><th>Nombre</th><th>Carrera</th><th>Créditos</th><th /></tr></thead><tbody>
      {his.map(x => <tr key={x.control}><td>{x.control}</td><td>{x.nombre}</td><td>{x.carrera}</td><td>{x.creditos_pct} %</td>
        <td><button className="sec" onClick={() => setAl({ control: x.control, nombre: x.nombre, carrera: x.carrera, ss: x.servicio_social, ac: x.act_complementarias, cr: String(x.creditos_pct), esp: x.curso_especial })}>Editar</button></td></tr>)}
    </tbody></table></div></div></>;

  return <>{tabs}
    <div className="stats">
      <div className="stat"><Icono n="bell" /><b>{nPend}</b><span>Por atender</span></div>
      <div className="stat"><Icono n="doc" /><b>{ts.length}</b><span>Trámites</span></div>
      <div className="stat"><Icono n={r === 'coordinacion' ? 'clock' : 'check'} /><b>{r === 'coordinacion' ? nLate : nOk}</b><span>{r === 'coordinacion' ? 'Con retraso' : 'Completados'}</span></div>
    </div>
    <div className="card"><h2>{titulo}</h2>
      {r === 'coordinacion' && <p className="hint">Los trámites con más de 3 días hábiles sin cambio aparecen resaltados.</p>}
      <div className="tw"><table><thead><tr><th>Folio</th><th>Residente</th><th>Estado</th>{r === 'coordinacion' && <th>Días hábiles</th>}<th /></tr></thead><tbody>
        {ts.map(x => {
          const ult = ev.find(e => e.tramite_id === x.id)?.created_at ?? x.created_at, d = diasHabiles(ult);
          const doc = docs.find(y => y.tramite_id === x.id && y.tipo === tipoDoc);
          return <tr key={x.id}><td>{x.folio}</td><td>{x.nombre}<div className="hint">{x.control}</div></td><td><span className="tag">{x.estado}</span></td>
            {r === 'coordinacion' && <td><span className={'tag' + (d > 3 && x.estado !== 'Carta lista' ? ' late' : '')}>{d}</span></td>}
            <td>{x.estado === pend && <button onClick={() => { setSel(x.id); setErrs([]); }}>Revisar</button>}{' '}
              {doc && <button className="sec" onClick={() => bajar(x, doc)}>PDF</button>}</td></tr>;
        })}
        {!ts.length && <tr><td colSpan={5}>No hay trámites todavía.</td></tr>}
      </tbody></table></div></div>
    {t && t.estado === pend && <div className="card"><h2>Revisar {t.folio}</h2>
      <p>{t.nombre} · {t.control} · {t.carrera}<br />Proyecto: {t.proyecto}</p>
      <ul className="chk">
        <li className={pagos.some(x => x.tramite_id === t.id) ? '' : 'no'}>Pago de $100.00 registrado · referencia {t.referencia}</li>
        <li className={docs.some(x => x.tramite_id === t.id && x.tipo === 'factura') ? '' : 'no'}>Factura simulada emitida</li>
        <li>Requisitos de inicio verificados por el sistema al registrar la solicitud</li></ul>
      {r === 'coordinacion' ? <><label htmlFor="mo">Motivo (obligatorio si rechazas)</label>
        <textarea id="mo" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} /><Errores l={errs} />
        <div className="row"><button onClick={() => decidir(t, true)}>Autorizar</button><button className="bad" onClick={() => decidir(t, false)}>Rechazar</button></div></>
        : <><Errores l={errs} /><div className="row"><button onClick={() => emitir(t)}>{r === 'escolares' ? 'Emitir constancia con folio' : 'Emitir carta con folio'}</button></div></>}
    </div>}
    <div className="card"><h3>Bitácora de cambios</h3><div className="tw"><table><thead><tr><th>Fecha</th><th>Folio</th><th>Estado</th><th>Quién</th></tr></thead><tbody>
      {ev.slice(0, 8).map(e => <tr key={e.id}><td>{fd(e.created_at)}</td><td>{ts.find(x => x.id === e.tramite_id)?.folio}</td><td>{e.estado}</td><td>{e.actor}</td></tr>)}
    </tbody></table></div></div></>;
}
