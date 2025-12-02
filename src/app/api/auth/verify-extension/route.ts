import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();
    
    if (!sessionToken) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No session token provided' 
      });
    }

    // Create a mock request with the session token
    const mockReq = {
      headers: {
        get: (name: string) => {
          if (name === 'cookie') {
            return `__Secure-next-auth.session-token=${sessionToken}`;
          }
          return null;
        }
      }
    } as any;

    // Verify the token using NextAuth's getToken
    const token = await getToken({ 
      req: mockReq,
      secret: process.env.NEXTAUTH_SECRET || "asdfgh1234",
      secureCookie: process.env.NODE_ENV === 'production'
    });

    if (token) {
      return NextResponse.json({
        authenticated: true,
        user: token.user
      });
    }

    return NextResponse.json({ 
      authenticated: false,
      error: 'Invalid session token'
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Verification failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method with sessionToken' 
  }, { status: 405 });
}