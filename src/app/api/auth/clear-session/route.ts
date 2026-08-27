import { NextRequest, NextResponse } from "next/server";
import { applyExpiredAuthCookies } from "../../../lib/session-cookies";

function clearedResponse(request: NextRequest, redirect = false) {
  const response = redirect
    ? NextResponse.redirect(new URL("/?loggedOut=1", request.url))
    : NextResponse.json({ ok: true });
  applyExpiredAuthCookies(response.headers);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  return clearedResponse(request, false);
}

export async function GET(request: NextRequest) {
  return clearedResponse(request, true);
}
