import "./globals.css";
import BottomNav from "./components/BottomNav";
import PresenceHeartbeat from "./components/PresenceHeartbeat";

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
        <PresenceHeartbeat />
        <main id="main-content" className="screen-enter mx-auto min-h-screen w-full max-w-5xl pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
