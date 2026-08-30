import { ImageResponse } from 'next/og';

export const alt = 'Nepal AI Twin — 100 satellite windows to six review leads';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const markers = [[780, 94], [1034, 135], [880, 254], [1065, 365], [754, 468], [952, 500]];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#fffaf3', color: '#17231f', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div style={{ width: 650, padding: '74px 58px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 23, letterSpacing: 4, color: '#0b7f71', marginBottom: 28 }}>EARTH EMBEDDING · REVIEW QUEUE</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02 }}>Nepal AI Twin</div>
        <div style={{ width: 570, height: 3, background: '#17231f', margin: '28px 0 30px' }} />
        <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.25, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex' }}><span style={{ color: '#c47a00', marginRight: 10 }}>100</span> satellite windows →</div>
          <div style={{ display: 'flex' }}><span style={{ color: '#c47a00', marginRight: 10 }}>6</span> places to inspect first</div>
        </div>
        <div style={{ fontSize: 21, marginTop: 30, color: '#52615c' }}>Review priority · not confirmed damage</div>
      </div>
      <div style={{ position: 'absolute', left: 690, top: 0, width: 510, height: 630, background: '#eaf5f2', display: 'flex' }}>
        {[0, 1, 2, 3, 4, 5].map((index) => <div key={`v-${index}`} style={{ position: 'absolute', left: 50 + index * 86, top: 0, width: 1, height: 630, background: '#88cfc3' }} />)}
        {[0, 1, 2, 3, 4, 5, 6].map((index) => <div key={`h-${index}`} style={{ position: 'absolute', left: 0, top: 46 + index * 88, width: 510, height: 1, background: '#88cfc3' }} />)}
        <svg width="510" height="630" viewBox="0 0 510 630" style={{ position: 'absolute', inset: 0 }}>
          <path d="M305 -20 C245 90 355 120 285 205 C220 285 345 330 282 415 C220 500 365 540 320 660" fill="none" stroke="#318eb4" strokeWidth="31" opacity="0.42" />
          <path d="M305 -20 C245 90 355 120 285 205 C220 285 345 330 282 415 C220 500 365 540 320 660" fill="none" stroke="#166a91" strokeWidth="4" />
          {[0, 1, 2, 3, 4].map((index) => <path key={index} d={`M${35 + index * 16} ${95 + index * 88} C160 ${45 + index * 90} 340 ${165 + index * 72} 505 ${90 + index * 86}`} fill="none" stroke="#788c86" strokeWidth="1.4" opacity="0.58" />)}
        </svg>
        {markers.map(([left, top], index) => <div key={index} style={{ position: 'absolute', left: left - 690, top, width: 24, height: 24, background: '#d79519', border: '3px solid #fffaf3' }} />)}
      </div>
    </div>,
    size,
  );
}
