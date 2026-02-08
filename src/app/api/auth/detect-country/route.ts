import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/detect-country
 * 
 * Detects the user's country from server-side request headers.
 * Works with Netlify, Vercel, Cloudflare, and other CDNs that inject
 * geo headers. Returns the ISO 3166-1 alpha-2 country code.
 */
export async function GET(request: NextRequest) {
  try {
    // Try multiple header sources (different hosting providers)
    const country =
      // Netlify
      request.headers.get('x-country') ||
      // Vercel
      request.headers.get('x-vercel-ip-country') ||
      // Cloudflare
      request.headers.get('cf-ipcountry') ||
      // AWS CloudFront
      request.headers.get('cloudfront-viewer-country') ||
      // Generic / custom
      request.headers.get('x-geo-country') ||
      // Next.js geo (when available)
      null;

    if (country && country !== 'XX') {
      return NextResponse.json({
        country: country.toUpperCase(),
        source: 'header',
      });
    }

    // If no geo header found, try IP-based detection via a free API
    // Only as fallback — in production, hosting headers are preferred
    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-nf-client-connection-ip') ||
      null;

    if (clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1') {
      try {
        const geoRes = await fetch(`https://ipapi.co/${clientIP}/country/`, {
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const countryCode = (await geoRes.text()).trim();
          if (countryCode.length === 2 && countryCode !== 'Undefined') {
            return NextResponse.json({
              country: countryCode.toUpperCase(),
              source: 'ip',
            });
          }
        }
      } catch {
        // IP lookup failed — fall through to unknown
      }
    }

    return NextResponse.json({
      country: null,
      source: 'unknown',
    });
  } catch (error) {
    console.error('Error detecting country:', error);
    return NextResponse.json({
      country: null,
      source: 'error',
    });
  }
}
