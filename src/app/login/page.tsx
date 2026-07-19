import Link from "next/link";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { LoginForm } from "@/components/auth/LoginForm";

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
    <AuthShowcase
      title="Ingresar"
      description="Continúa con tus reservas, comprobantes y datos de huésped."
      footer={
        <p className="mt-4 text-center text-sm text-white/78">
          ¿No tienes cuenta?{" "}
          <Link
            href={nextPath ? `/crear-cuenta?next=${encodeURIComponent(nextPath)}` : "/crear-cuenta"}
            className="font-semibold text-white underline underline-offset-4"
          >
            Crear cuenta
          </Link>
        </p>
      }
    >
      <LoginForm nextPath={nextPath} />
    </AuthShowcase>
  );
}
