import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Regístrate como cliente sin verificación por correo.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-100">
              Ingresar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
