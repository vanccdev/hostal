import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const safeNextPath = (value: string | string[] | undefined) => {
  const nextPath = Array.isArray(value) ? value[0] : value;

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return undefined;
  }

  return nextPath;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f6f1e6] px-4 py-6 dark:bg-[#101a14] md:items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandLogo />
          <CardTitle>Ingresar</CardTitle>
          <CardDescription>Accede al sistema de gestión del hostal.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm nextPath={nextPath} />
          <p className="mt-4 text-center text-sm text-[#66736a] dark:text-[#b7c0b4]">
            ¿No tienes cuenta?{" "}
            <Link
              href={nextPath ? `/crear-cuenta?next=${encodeURIComponent(nextPath)}` : "/crear-cuenta"}
              className="font-semibold text-[#18221b] underline underline-offset-4 dark:text-zinc-100"
            >
              Crear cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
