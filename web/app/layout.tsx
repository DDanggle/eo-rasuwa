import type { Metadata } from 'next';
import Script from 'next/script';
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const gaId = process.env.NEXT_PUBLIC_GA_ID;  // 설정 시에만 Google Analytics 로드

// Ai2 종이 톤 전환(2026-08-28): 폰트만 IBM Plex로 교체하고 CSS 변수 이름은 유지함
// (--font-geist-* 를 참조하는 규칙 50여 곳을 건드리지 않기 위해).
const geistSans = IBM_Plex_Sans_KR({
  variable: '--font-geist-sans', subsets: ['latin'], weight: ['400', '500', '600', '700'],
});
const geistMono = IBM_Plex_Mono({
  variable: '--font-geist-mono', subsets: ['latin'], weight: ['400', '600', '700'],
});
// STORY 스크롤리텔링 헤드라인용 — 저널리즘 톤의 핵심 (본문은 그대로 Plex).
const storySerif = Source_Serif_4({
  variable: '--font-serif', subsets: ['latin'], weight: ['400', '600', '700'], style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl ?? 'https://eo-rasuwa.dev'),
  title: { default: 'Nepal AI Twin — Rasuwa 2026', template: '%s · Nepal AI Twin' },
  description: 'An independent AI twin of the 26 Aug 2026 Rasuwa flash flood: satellite windows compared with a general Earth-embedding model to rank places to inspect first.',
  applicationName: 'Nepal AI Twin',
  authors: [{ name: 'Nepal AI Twin research project' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: '100 places re-imaged after the Nepal flood. Where do you look first?',
    description: 'A general Earth model, used frozen, ranked six windows for people to check first — and the honest limits of that ranking.',
    siteName: 'Nepal AI Twin',
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Rasuwa 2026 — 100 satellite windows ranked to six places to check first' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '100 places re-imaged after the Nepal flood. Where do you look first?',
    description: 'A general Earth model, used frozen, ranked six windows for people to check first — and the honest limits of that ranking.',
      images: ['/og.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${storySerif.variable}`}>{children}
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}</Script>
          </>
        )}</body>
    </html>
  );
}
