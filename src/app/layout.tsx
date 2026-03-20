import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { NuqsProvider } from "@/providers/NuqsProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { SidebarProvider } from "@/providers/SidebarProvider";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationLayer } from "@/components/layout/NotificationLayer";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FogoScope",
  description: "Fogo Execution Quality & MEV Transparency Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <NuqsProvider>
          <QueryProvider>
            <TooltipProvider>
              <SidebarProvider>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 flex flex-col overflow-hidden">
                    <TopBar />
                    <div className="flex-1 overflow-y-auto">{children}</div>
                  </main>
                </div>
              </SidebarProvider>
              <CommandPalette />
              <NotificationLayer />
              <Toaster
                theme="dark"
                position="bottom-right"
                richColors
                closeButton
                toastOptions={{
                  className: "!bg-[#111827] !border-[#1e293b] !text-[#f1f5f9]",
                  descriptionClassName: "!text-[#94a3b8]",
                }}
              />
            </TooltipProvider>
          </QueryProvider>
        </NuqsProvider>
      </body>
    </html>
  );
}
