import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Google devuelve campos que NO existen en el modelo Account (p.ej.
// refresh_token_expires_in, not-before-policy). El adaptador por defecto los
// intenta insertar y Prisma lanza un error -> OAUTH_CALLBACK_ERROR.
// Filtramos a los campos válidos del modelo Account.
const ACCOUNT_FIELDS = [
  "userId",
  "type",
  "provider",
  "providerAccountId",
  "refresh_token",
  "access_token",
  "expires_at",
  "token_type",
  "scope",
  "id_token",
  "session_state",
];

function buildAdapter(): Adapter {
  const adapter = PrismaAdapter(prisma);
  const originalLinkAccount = adapter.linkAccount!;
  // Los tipos AdapterAccount de next-auth y @auth/core difieren; usamos any
  // para puentear ambas definiciones de forma segura.
  adapter.linkAccount = (account: any) => {
    const filtered = Object.fromEntries(
      Object.entries(account).filter(([k]) => ACCOUNT_FIELDS.includes(k))
    );
    return originalLinkAccount(filtered as any);
  };
  return adapter;
}

// Scopes necesarios para leer el canal y vídeos del usuario.
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
  // Necesario para retención de audiencia y métricas avanzadas
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

export const authOptions: NextAuthOptions = {
  adapter: buildAdapter(),
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Permite vincular Google a un usuario existente (mismo email) creado
      // mediante credenciales. Necesario para conectar YouTube tras registrarse.
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
