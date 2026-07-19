import Link from "next/link";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { SignupForm } from "@/components/auth/SignupForm";

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
    <AuthShowcase
      title="Crear cuenta"
      description="Regístrate para guardar tus reservas y continuar tu estadía sin perder lo que elegiste."
      eyebrow="Reserva más rápido"
      cardClassName="max-w-[31rem]"
      footer={
        <p className="mt-4 text-center text-sm text-white/78">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="font-semibold text-white underline underline-offset-4"
          >
            Ingresar
          </Link>
        </p>
      }
    >
      <SignupForm nextPath={nextPath} />
    </AuthShowcase>
  );
}
