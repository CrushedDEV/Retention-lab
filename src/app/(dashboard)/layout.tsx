import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tokens: true },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={session.user.name ?? session.user.email}
        tokens={me?.tokens ?? 0}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
