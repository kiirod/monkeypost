import { Roboto_Mono } from "next/font/google";
import "./globals.css";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={robotoMono.className}>
      <body style={{ backgroundColor: "#323437", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
