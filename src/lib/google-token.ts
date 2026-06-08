import { prisma } from "@/lib/prisma";

/**
 * Devuelve un access_token de Google válido para el usuario.
 * Refresca automáticamente usando el refresh_token si ha expirado.
 * Devuelve null si el usuario no ha conectado su cuenta de Google.
 */
export async function getGoogleAccessToken(
  userId: string
): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) return null;

  const now = Math.floor(Date.now() / 1000);
  const stillValid = account.expires_at && account.expires_at - 60 > now;
  if (stillValid) return account.access_token;

  // Necesita refresco
  if (!account.refresh_token) return account.access_token;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    if (!res.ok) {
      console.error("Error refrescando token de Google", await res.text());
      return account.access_token;
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        expires_at: now + data.expires_in,
        ...(data.refresh_token
          ? { refresh_token: data.refresh_token }
          : {}),
      },
    });

    return data.access_token;
  } catch (err) {
    console.error("Fallo al refrescar token de Google", err);
    return account.access_token;
  }
}

export async function hasGoogleConnected(userId: string): Promise<boolean> {
  const count = await prisma.account.count({
    where: { userId, provider: "google" },
  });
  return count > 0;
}
