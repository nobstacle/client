// app/api/auth/verify-extension/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();
    
    if (!sessionToken) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No session token provided' 
      }, { status: 401 });
    }

    console.log('[verify-extension] Setting cookie and redirecting to session check...');

    // Set the session cookie
    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    // Return response that sets the cookie
    const response = NextResponse.json({
      authenticated: true,
      cookieSet: true,
      message: 'Cookie set, iframe should now use useSession()'
    });

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return response;

  } catch (error) {
    console.error('[verify-extension] Error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Verification failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method with sessionToken' 
  }, { status: 405 });
}