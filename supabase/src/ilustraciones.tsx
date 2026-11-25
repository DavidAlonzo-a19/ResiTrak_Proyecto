import type { ReactNode } from 'react';

// Íconos de línea (hereda el color del texto)
const P: Record<string, ReactNode> = {
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  bank: <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  bell: <path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};
export const Icono = ({ n }: { n: string }) => <svg viewBox="0 0 24 24" aria-hidden="true">{P[n]}</svg>;

/** Ilustración de la pantalla de acceso: laptop con el avance del trámite y documentos flotando. */
export function Hero() {
  const pasos = ['Pago', 'Factura', 'Constancia', 'Autoriza', 'Carta'];
  return (
    <svg className="hero-ilus" viewBox="0 0 460 290" role="img" aria-label="Ilustración de un trámite con seguimiento en pantalla">
      <ellipse cx="230" cy="268" rx="190" ry="14" fill="rgba(0,0,0,.2)" />
      <rect x="40" y="226" width="380" height="16" rx="8" fill="#0b1a3d" />
      <rect x="82" y="38" width="296" height="196" rx="14" fill="#0b1a3d" />
      <rect x="92" y="48" width="276" height="176" rx="8" fill="#fff" />
      <rect x="92" y="48" width="276" height="26" rx="8" fill="#e3ebf8" />
      <circle cx="108" cy="61" r="4" fill="#f0a83a" /><circle cx="122" cy="61" r="4" fill="#2f5fd0" /><circle cx="136" cy="61" r="4" fill="#1a8a5a" />
      <text x="110" y="102" fontSize="14" fontWeight="700" fill="#14213d">Tu trámite</text>
      <rect x="110" y="112" width="240" height="8" rx="4" fill="#dbe5f5" />
      <rect x="110" y="112" width="144" height="8" rx="4" fill="#2f5fd0" />
      <line x1="130" y1="165" x2="330" y2="165" stroke="#dbe5f5" strokeWidth="6" strokeLinecap="round" />
      <line x1="130" y1="165" x2="230" y2="165" stroke="#1b3c88" strokeWidth="6" strokeLinecap="round" />
      {pasos.map((n, i) => {
        const x = 130 + i * 50, hecho = i < 2, act = i === 2;
        return (
          <g key={n}>
            <circle cx={x} cy="165" r="14" fill={hecho ? '#1b3c88' : act ? '#f0a83a' : '#fff'} stroke={hecho || act ? 'none' : '#c4d2ea'} strokeWidth="3" />
            {hecho && <path d={`M${x - 6} 165l4 4 8-8`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            <text x={x} y="196" textAnchor="middle" fontSize="9" fill="#56657d">{n}</text>
          </g>
        );
      })}
      <g className="flota">
        <rect x="0" y="20" width="104" height="58" rx="12" fill="#fff" />
        <rect x="10" y="30" width="26" height="16" rx="4" fill="#f0a83a" />
        <text x="10" y="64" fontSize="14" fontWeight="700" fill="#14213d">$100.00</text>
        <text x="10" y="74" fontSize="7.5" fill="#56657d">Pago simulado</text>
      </g>
      <g className="flota2">
        <path d="M366 20h50l28 28v70H366z" fill="#fff" /><path d="M416 20v28h28z" fill="#dbe5f5" />
        <rect x="378" y="62" width="52" height="5" rx="2" fill="#c4d2ea" /><rect x="378" y="74" width="40" height="5" rx="2" fill="#c4d2ea" />
        <rect x="378" y="96" width="34" height="14" rx="3" fill="#a4262c" />
        <text x="395" y="107" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">PDF</text>
      </g>
      <g className="flota">
        <rect x="20" y="190" width="64" height="44" rx="8" fill="#f0a83a" />
        <path d="M24 196l28 20 28-20" fill="none" stroke="#14213d" strokeWidth="3" strokeLinejoin="round" />
      </g>
      <g className="flota2">
        <circle cx="372" cy="205" r="20" fill="#1a8a5a" />
        <path d="M362 205l7 7 12-14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Dibujo para cuando todavía no hay nada que mostrar. */
export function Vacio({ t }: { t: string }) {
  return (
    <div className="vacio">
      <svg viewBox="0 0 120 100" aria-hidden="true">
        <circle cx="60" cy="52" r="42" fill="rgba(47,95,208,.12)" />
        <rect x="38" y="24" width="44" height="56" rx="6" fill="#fff" stroke="#9db4e6" strokeWidth="2" />
        <path d="M46 40h28M46 50h28M46 60h16" stroke="#9db4e6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="88" cy="26" r="4" fill="#f0a83a" /><circle cx="28" cy="70" r="3" fill="#2f5fd0" />
      </svg>
      <p>{t}</p>
    </div>
  );
}

/** Encabezado de bienvenida del residente con su avance. */
export function Bienvenida({ nombre, hechos }: { nombre: string; hechos: number }) {
  const pct = Math.round((hechos / 5) * 100);
  return (
    <div className="bienvenida">
      <div className="avatar" aria-hidden="true">{nombre.trim().charAt(0).toUpperCase()}</div>
      <div className="bv-texto">
        <h2>Hola, {nombre.trim().split(' ')[0]}</h2>
        <p>{hechos >= 5 ? 'Completaste todos los pasos previos a la plataforma.' : `Llevas ${hechos} de 5 pasos de tu inicio de residencia.`}</p>
        <div className="progreso" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: pct + '%' }} /></div>
      </div>
      <div className="pct">{pct}%</div>
    </div>
  );
}
