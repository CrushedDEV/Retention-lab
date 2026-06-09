import { prisma } from "@/lib/prisma";

export {
  DEFAULT_TOKENS,
  TOKEN_COSTS,
  type TokenAction,
} from "@/lib/token-costs";

/**
 * Consume tokens de forma ATÓMICA: solo descuenta si el saldo es suficiente.
 * Devuelve true si se consumieron, false si no había saldo.
 */
export async function consumeTokens(
  userId: string,
  amount: number
): Promise<boolean> {
  const res = await prisma.user.updateMany({
    where: { id: userId, tokens: { gte: amount } },
    data: { tokens: { decrement: amount } },
  });
  return res.count === 1;
}

/** Reembolsa tokens (p. ej. si la operación falló tras reservarlos). */
export async function refundTokens(
  userId: string,
  amount: number
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokens: { increment: amount } },
  });
}

export async function getTokenBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokens: true },
  });
  return u?.tokens ?? 0;
}
