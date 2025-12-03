// app/api/auth/get-user-from-token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();
    
    if (!sessionToken) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No session token provided' 
      }, { status: 401 });
    }

    console.log('[get-user-from-token] Decoding token...');

    // Decode the JWE token
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (!decoded) {
      console.log('[get-user-from-token] Failed to decode');
      return NextResponse.json({ 
        authenticated: false,
        error: 'Invalid session token'
      }, { status: 401 });
    }

    // Check expiration
    const exp = typeof decoded.exp === 'string' ? parseInt(decoded.exp, 10) : Number(decoded.exp);
    if (exp && exp * 1000 < Date.now()) {
      console.log('[get-user-from-token] Token expired');
      return NextResponse.json({ 
        authenticated: false,
        error: 'Session expired'
      }, { status: 401 });
    }

    // Extract user - your token structure has user nested
    const user = decoded.user;

    if (!user) {
      console.log('[get-user-from-token] No user in token');
      return NextResponse.json({ 
        authenticated: false,
        error: 'No user data in token'
      }, { status: 401 });
    }

    console.log('[get-user-from-token] ✓ User authenticated:', user.email || user.name);
    console.log('[get-user-from-token] User has backendTokens:', !!user.backendTokens);
    console.log('[get-user-from-token] backendTokens structure:', JSON.stringify(user.backendTokens));
    console.log('[get-user-from-token] Backend token (atc):', user.backendTokens);

    return NextResponse.json({
      authenticated: true,
      user: user, // This includes backendTokens
      backendTokens: user.backendTokens // Make it explicit
    });

  } catch (error) {
    console.error('[get-user-from-token] Error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: error instanceof Error ? error.message : 'Failed to decode token'
    }, { status: 500 });
  }
}