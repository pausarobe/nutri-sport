import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "@/lib/env";

const protectedPrefixes = ["/dashboard", "/clients"];
const authPrefixes = ["/login"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!hasSession && protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const urlToRedirect = request.nextUrl.clone();
    urlToRedirect.pathname = "/login";
    urlToRedirect.searchParams.set("next", pathname);
    return NextResponse.redirect(urlToRedirect);
  }

  if (hasSession && authPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const urlToRedirect = request.nextUrl.clone();
    urlToRedirect.pathname = "/dashboard";
    urlToRedirect.search = "";
    return NextResponse.redirect(urlToRedirect);
  }

  return response;
}
