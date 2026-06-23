import { Antonio, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import {
  LcarsHeader,
  LcarsSidebar,
  LcarsMainContent,
  LcarsFooter,
} from "@/components/lcars";
import { NeoProvider } from "@/context/NeoProvider";

const antonio = Antonio({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-antonio",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono-lcars",
});

export const metadata = {
  title: {
    default: "Neo Archive",
    template: "%s · Neo Archive", // %s wird durch den Seiten-Titel ersetzt
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${antonio.variable} ${shareTechMono.variable}`}>
      <body>
        <NeoProvider>
          <div className="flex w-full h-[100dvh]">
            <LcarsSidebar />
            <div className="flex flex-col flex-1 h-full overflow-hidden">
              <LcarsHeader />
              <LcarsMainContent>{children}</LcarsMainContent>
              <LcarsFooter />
            </div>
          </div>
        </NeoProvider>
      </body>
    </html>
  );
}
