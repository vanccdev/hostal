import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ingresar</CardTitle>
          <CardDescription>Accede al sistema de gestión del hostal.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            ¿No tienes cuenta?{" "}
            <Link href="/crear-cuenta" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-100">
              Crear cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
