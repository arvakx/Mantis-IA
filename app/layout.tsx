import type { Metadata } from 'next';
import { DM_Sans, IBM_Plex_Mono, Syne } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
});

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-tech',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Mantis IA | Mantenimiento inteligente',
  description:
    'Plataforma inteligente para planificar, explicar y documentar el mantenimiento preventivo de maquinaria.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${dmSans.variable} ${syne.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
