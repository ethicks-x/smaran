import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Smaran — Because Every Memory Matters",
  description:
    "Smaran helps caregivers create personalized cognitive experiences and stay connected with the people they care for.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6C4FCB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ClerkProvider wraps <html>, not the body: it needs to be the outermost
    // element for `auth()` in a server component and `useAuth()` in a client one
    // to resolve to the same session.
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className="antialiased"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
