import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Delqhi Network',
  description: 'The social network for the future',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-bg text-dark-text min-h-screen`}>
        <Providers>
          <Navbar />
          <main className="container mx-auto px-4 py-6 max-w-2xl">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
