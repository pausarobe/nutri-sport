import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function baseUrl(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost && process.env.NODE_ENV !== "development") {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, baseUrl(request)));
}

function redirectWithError(request: NextRequest) {
  const url = new URL("/login", baseUrl(request));
  url.searchParams.set(
    "error",
    "Could not confirm your email. Try signing in again.",
  );

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? redirectWithError(request) : redirectTo(request, next);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    return error ? redirectWithError(request) : redirectTo(request, next);
  }

  return redirectWithError(request);
}
