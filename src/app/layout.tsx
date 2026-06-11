import type { Metadata } from 'next';
import { Antonio, Share_Tech_Mono } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'LCARS NEO ARCHIVE',
  description: 'NEO - A space Opera Roleplaying Game: Archive',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${antonio.variable} ${shareTechMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}