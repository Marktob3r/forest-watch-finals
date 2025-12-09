import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forest Watch",
  description: "A Real-Time Forest Monitoring and Conservation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}