// Constantes de coste compartidas entre cliente y servidor.
// (Sin importar prisma, para poder usarlas en componentes cliente.)

export const DEFAULT_TOKENS = 100;

export const TOKEN_COSTS = {
  analyze: 5,
  generate: 5,
} as const;

export type TokenAction = keyof typeof TOKEN_COSTS;
