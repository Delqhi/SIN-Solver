import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2Captcha Worker Dashboard",
  description: "Real-time monitoring dashboard for 2Captcha worker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
