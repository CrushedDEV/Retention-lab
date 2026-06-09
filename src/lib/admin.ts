import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/** Emails admin definidos en la variable de entorno ADMIN_EMAILS (separados por comas). */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * Devuelve la sesión solo si el usuario es admin; si no, null.
 * Úsalo al inicio de cada ruta/página de administración.
 */
export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user || !isAdminEmail(session.user.email)) return null;
  return session;
}
