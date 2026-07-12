import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const safeNextPath = (value: string | string[] | undefined) => {
  const nextPath = Array.isArray(value) ? value[0] : value;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return undefined;
  }

  return nextPath;
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f6f1e6] px-4 py-6 dark:bg-[#101a14] md:items-center md:py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <BrandLogo />
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Regístrate como cliente sin verificación por correo.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm nextPath={nextPath} />
          <p className="mt-4 text-center text-sm text-[#66736a] dark:text-[#b7c0b4]">
            ¿Ya tienes cuenta?{" "}
            <Link
              href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
              className="font-semibold text-[#18221b] underline underline-offset-4 dark:text-zinc-100"
            >
              Ingresar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
