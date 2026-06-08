"use client";

import { signIn } from "next-auth/react";
import { YoutubeIcon } from "@/components/icons";

export function ConnectYouTubeButton({ connected }: { connected: boolean }) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/settings" })}
      className={connected ? "btn-secondary" : "btn-primary"}
    >
      <YoutubeIcon className="h-4 w-4" />
      {connected ? "Reconectar" : "Conectar con YouTube"}
    </button>
  );
}
