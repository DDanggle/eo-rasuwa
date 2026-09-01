import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// IP 국가 기반 기본 언어: 한국(KR)이면 ko, 그 외 en.
// Vercel edge가 x-vercel-ip-country를 채워준다. 로컬에서는 쿠키가 없으므로
// 클라이언트가 navigator.language로 폴백한다. 사용자가 토글하면 쿠키가 갱신되어 우선한다.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get('lang')) {
    const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase();
    if (country) response.cookies.set('lang', country === 'KR' ? 'ko' : 'en', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}

export const config = { matcher: ['/', '/map', '/story'] };
