"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  VideoIcon,
  ChartIcon,
  SparkIcon,
  SettingsIcon,
  LogoutIcon,
  BookIcon,
  UsersIcon,
  WaveLogo,
} from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { href: "/guide", label: "Cómo usar", Icon: BookIcon },
  { href: "/dashboard", label: "Vídeos", Icon: VideoIcon },
  { href: "/explore", label: "Explorar creadores", Icon: UsersIcon },
  { href: "/analysis", label: "Análisis", Icon: ChartIcon },
  { href: "/generator", label: "Generador", Icon: SparkIcon },
  { href: "/settings", label: "Ajustes", Icon: SettingsIcon },
];

export function Sidebar({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  const initial = (userName ?? "?").trim().charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] flex-col border-r border-line bg-surface/40 backdrop-blur-xl">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-6 py-6">
        <WaveLogo />
        <div className="leading-none">
          <p className="font-display text-[15px] font-bold tracking-tight text-ink">
            Script
          </p>
          <p className="font-display text-[15px] font-bold tracking-tight text-accent">
            Intelligence
          </p>
        </div>
      </div>

      <p className="eyebrow px-6 pb-3 pt-2">Workspace</p>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-surface2 text-ink"
                  : "text-muted hover:bg-surface2/60 hover:text-ink"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon
                className={`h-[18px] w-[18px] transition-colors ${
                  active ? "text-accent" : "text-muted group-hover:text-ink"
                }`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Pie: usuario + tema + salir */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent">
            {initial}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            {userName ?? "Mi cuenta"}
          </p>
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-ghost mt-1 w-full justify-start"
        >
          <LogoutIcon className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
