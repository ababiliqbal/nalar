import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nalar — Platform Belajar Logika & Transisi Python SMA',
  description:
    'Platform latihan berpikir komputasional dan transisi pemrograman Python untuk siswa SMA Kelas X (KKA Fase E) dengan alur 4 tahap dan bimbingan AI adaptif.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink-primary font-sans selection:bg-primary/15 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
