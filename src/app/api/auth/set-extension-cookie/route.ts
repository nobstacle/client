// app/api/auth/set-extension-cookie/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();
    
    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session token provided' 
      }, { status: 400 });
    }

    console.log('[set-extension-cookie] Setting session cookie...');

    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

    const response = NextResponse.json({
      success: true,
      message: 'Cookie set successfully'
    });

    // Set the session cookie with proper attributes
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      domain: process.env.NODE_ENV === 'production' ? '.nobstacle.com' : undefined
    });

    console.log('[set-extension-cookie] ✓ Cookie set');

    return response;

  } catch (error) {
    console.error('[set-extension-cookie] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to set cookie'
    }, { status: 500 });
  }
}