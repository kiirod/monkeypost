import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "Monkeypost",
  description: "Monkeypost is the social media for Monkeytype, keyboards, typeracer, typegg, and so much more!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${robotoMono.variable} font-mono bg-[#323437] antialiased`}>
        {children}
      </body>
    </html>
  );
}
