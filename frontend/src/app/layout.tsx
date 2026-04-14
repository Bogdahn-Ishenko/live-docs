import "@/fsd/app/css/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/fsd/app/providers/theme-provider";
import { cn } from "@/fsd/shared/lib/utils";
import "reactflow/dist/style.css";
import { Toaster } from "sonner";

const MtsWide = localFont({
  src: "./fonts/MTSWide-Medium.woff2",
  variable: "--font-mtswide-sans",
  display: "swap",
});

const MtsCompact = localFont({
  src: "./fonts/MTSCompact-Medium.woff2",
  variable: "--font-mtscompact",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "WikiLive",
  description: "WikiLive",
  icons: {
    icon: "/branding/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        MtsWide.className,
        MtsCompact.className,
        inter.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              className:
                "rounded-md border bg-background text-foreground shadow-lg",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

