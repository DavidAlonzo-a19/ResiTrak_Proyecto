import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const CONFIGURADO = Boolean(url && key);
export const sb = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');

export type Rol = 'residente' | 'coordinacion' | 'escolares' | 'vinculacion';
export type Estado = 'Pago pendiente' | 'Pagada' | 'Constancia emitida' | 'Devuelta' | 'Autorizada' | 'Carta lista';
export interface Perfil { id: string; role: Rol; nombre: string; control: string | null; carrera: string | null; correo: string }
export interface Tramite {
  id: string; folio: string; user_id: string; control: string; nombre: string; carrera: string; proyecto: string;
  rfc: string | null; estado: Estado; ref_num: number; referencia: string; ref_expira: string; motivo: string | null; created_at: string;
}
export interface Pago { tramite_id: string; referencia: string; monto: number; operacion: string; fecha_deposito: string }
export interface Doc { id: string; tramite_id: string; tipo: 'factura' | 'constancia' | 'carta'; folio: string; uuid_sim: string | null; created_at: string }
export interface Evento { id: number; tramite_id: string; estado: string; actor: string; created_at: string }
export interface Aviso { id: number; mensaje: string; created_at: string }
export interface Historial {
  control: string; nombre: string; carrera: string; servicio_social: boolean;
  act_complementarias: boolean; creditos_pct: number; curso_especial: boolean;
}

export const CARRERAS = ['Ingeniería en Sistemas Computacionales', 'Ingeniería Civil'];
export const ROL: Record<Rol, string> = {
  residente: 'Residente', coordinacion: 'Coordinación de carrera',
  escolares: 'Servicios Escolares', vinculacion: 'Gestión Tecnológica y Vinculación',
};

export const fd = (d: string) => new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/** Días hábiles (lunes a viernes) transcurridos desde una fecha (RF-10). */
export function diasHabiles(desde: string): number {
  const a = new Date(desde); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  let n = 0;
  while (a < b) { a.setDate(a.getDate() + 1); if (a.getDay() % 6) n++; }
  return n;
}

export const requisitos = (h: Historial): [string, boolean][] => [
  ['Servicio social acreditado', h.servicio_social],
  ['Actividades complementarias acreditadas', h.act_complementarias],
  [`80 % de créditos (lleva ${h.creditos_pct} %)`, h.creditos_pct >= 80],
  ['Ninguna asignatura en curso especial', !h.curso_especial],
];

/** Convierte los errores de la base de datos en mensajes claros para el usuario (RNF-04). */
export function mensajes(msg: string): string[] {
  if (/row-level security/i.test(msg)) return ['No tienes permiso para esta acción o no cumples los requisitos para iniciar.'];
  if (/duplicate key/i.test(msg)) return ['Ese dato ya existe en el sistema.'];
  return msg.split('|');
}
