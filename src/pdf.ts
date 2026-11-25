import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import type { Doc, Historial, Pago, Tramite } from './lib';
import { fd } from './lib';

const AZUL = rgb(0.11, 0.24, 0.53);

function lineas(texto: string, font: PDFFont, size: number, max: number): string[] {
  const out: string[] = []; let linea = '';
  for (const w of texto.split(' ')) {
    const prueba = linea ? linea + ' ' + w : w;
    if (font.widthOfTextAtSize(prueba, size) > max && linea) { out.push(linea); linea = w; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}

async function crear(titulo: string, filas: [string, string][], sello: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const p = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);
  try {
    const bytes = await fetch(import.meta.env.BASE_URL + 'tecnm-logo.png').then(r => r.arrayBuffer());
    const img = await pdf.embedPng(bytes);
    p.drawImage(img, { x: 40, y: 760, width: 62, height: 62 });
  } catch { /* si no carga el logo, el PDF se genera sin él */ }
  p.drawText('Tecnológico Nacional de México', { x: 115, y: 800, size: 15, font: b, color: AZUL });
  p.drawText('Instituto Tecnológico de Matehuala · Residencia Profesional', { x: 115, y: 782, size: 10, font: f });
  p.drawLine({ start: { x: 40, y: 745 }, end: { x: 555, y: 745 }, thickness: 1.5, color: AZUL });
  p.drawText(titulo, { x: 40, y: 710, size: 18, font: b, color: AZUL });
  let y = 675;
  for (const [k, v] of filas) {
    p.drawText(k, { x: 40, y, size: 10, font: b });
    for (const l of lineas(v, f, 11, 380)) { p.drawText(l, { x: 165, y, size: 11, font: f }); y -= 16; }
    y -= 8;
  }
  p.drawText(sello, { x: 40, y: 90, size: 12, font: b, color: rgb(0.64, 0.15, 0.17) });
  p.drawText('Documento generado por el sistema el ' + fd(new Date().toISOString()) + '. Datos de prueba.', { x: 40, y: 70, size: 8, font: f });
  return pdf.save();
}

export function generarPdf(d: Doc, t: Tramite, pago?: Pago, h?: Historial | null): Promise<Uint8Array> {
  const base: [string, string][] = [['Folio', d.folio], ['Fecha de emisión', fd(d.created_at)]];
  if (d.tipo === 'factura') return crear('Factura', [...base,
    ['Emisor', 'Instituto Tecnológico de Matehuala · Recursos Financieros (simulado)'],
    ['Receptor', `${t.nombre} · RFC ${t.rfc ?? ''}`],
    ['Concepto', 'Constancia de avance de carrera'],
    ['Total', '$100.00 MXN'],
    ['Referencia', pago?.referencia ?? t.referencia],
    ['No. de operación', pago?.operacion ?? ''],
    ['Fecha de depósito', pago?.fecha_deposito ?? ''],
    ['UUID simulado', d.uuid_sim ?? ''],
  ], 'FACTURA SIMULADA · SIN VALIDEZ FISCAL');
  if (d.tipo === 'constancia') return crear('Constancia de avance de carrera', [...base,
    ['Residente', t.nombre], ['Número de control', t.control], ['Carrera', t.carrera],
    ['Avance de créditos', h ? `${h.creditos_pct} %` : 'Consultar historial'],
    ['Hace constar', 'Servicios Escolares hace constar que el residente cuenta con el avance de créditos indicado, servicio social y actividades complementarias acreditados.'],
  ], 'DOCUMENTO SIMULADO · SIN VALIDEZ OFICIAL');
  return crear('Carta de presentación', [...base,
    ['Residente', t.nombre], ['Número de control', t.control], ['Carrera', t.carrera], ['Proyecto', t.proyecto],
    ['Texto', 'A quien corresponda: se presenta al residente para realizar su Residencia Profesional con el proyecto indicado. Gestión Tecnológica y Vinculación.'],
  ], 'DOCUMENTO SIMULADO · SIN VALIDEZ OFICIAL');
}

export function descargar(bytes: Uint8Array, nombre: string) {
  const u = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = u; a.download = nombre + '.pdf'; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
