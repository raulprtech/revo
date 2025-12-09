import { NextResponse } from 'next/server'

// Middleware completamente deshabilitado para debugging
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: []  // No match anything - effectively disabled
}
