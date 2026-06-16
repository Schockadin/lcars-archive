import { Antonio, Share_Tech_Mono } from 'next/font/google';
import './globals.css';
import { LcarsHeader, LcarsSidebar  } from '@/components/lcars';
import LcarsElbowBar from '@/components/lcars/LcarsElbowBar';
import { NeoProvider } from '@/context/NeoProvider';

const antonio = Antonio({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-antonio',
});

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono-lcars',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="de" className={`${antonio.variable} ${shareTechMono.variable}`}>
        <body>
          <NeoProvider>
            <LcarsHeader/>
            <LcarsElbowBar/>
            <div className="flex w-full h-[calc(100% - var(--lcars-header-h) - 32px)]">
              <LcarsSidebar/>
              <main className="px-[16px] pt-[16px] w-full">{children}</main>
            </div>
            {/* <LcarsFooter/> */}
          </NeoProvider>
        </body>
      </html>
  );
}