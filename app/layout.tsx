import "./globals.css";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "Noble Gamers",
  description: "Competitive DLS Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-navy-950 text-white">
      <body>
        <div className="min-h-screen max-w-lg mx-auto pb-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}