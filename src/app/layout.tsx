import type { Metadata } from "next";
import { Bricolage_Grotesque, Sora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});
const sans = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Script Intelligence",
  description:
    "Mejora tus guiones de YouTube, TikTok e Instagram con análisis basado en rendimiento real.",
};

// Aplica el tema antes del primer paint para evitar parpadeo. Oscuro por defecto.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('si-theme');
    if (t === 'light') document.documentElement.setAttribute('data-theme','light');
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
