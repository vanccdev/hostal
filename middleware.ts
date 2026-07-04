import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/admin", "/app"];
const publicAuthPaths = ["/login", "/crear-cuenta"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isPublicAuth = publicAuthPaths.includes(pathname);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user || (!isProtected && !isPublicAuth)) {
    return response;
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol,activo,must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (isPublicAuth && profile?.activo) {
    const url = request.nextUrl.clone();
    url.pathname = profile.rol === "cliente" ? "/app" : "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!profile || !profile.activo) {
    return response;
  }

  if (pathname.startsWith("/admin") && profile.rol === "cliente") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/app") &&
    profile.rol === "cliente" &&
    profile.must_change_password &&
    pathname !== "/app/cambiar-contrasena"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/cambiar-contrasena";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

