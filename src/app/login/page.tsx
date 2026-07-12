import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
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
    <main className="flex min-h-screen items-start justify-center bg-[#f7f7f7] px-4 py-6 dark:bg-[#151515] md:items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-bold text-[#ff385c]">Hostal</p>
          <CardTitle>Ingresar</CardTitle>
          <CardDescription>Accede al sistema de gestión del hostal.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm nextPath={nextPath} />
          <p className="mt-4 text-center text-sm text-[#717171] dark:text-[#b0b0b0]">
            ¿No tienes cuenta?{" "}
            <Link
              href={nextPath ? `/crear-cuenta?next=${encodeURIComponent(nextPath)}` : "/crear-cuenta"}
              className="font-semibold text-[#222222] underline underline-offset-4 dark:text-zinc-100"
            >
              Crear cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
