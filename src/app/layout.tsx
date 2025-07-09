import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { NoFlashScript } from '@/components/no-flash';

export const metadata: Metadata = {
  title: 'SheetMark - Convert Spreadsheets to Markdown Tables',
  description: 'Easily convert your spreadsheet data from CSV, TSV, or by pasting directly into a clean Markdown table. Fast, free, and easy to use.',
  keywords: ['spreadsheet to markdown', 'csv to markdown', 'excel to markdown', 'table converter', 'markdown table generator', 'sheetmark', 'hoja de calculo a markdown', 'csv a markdown'],
  openGraph: {
    title: 'SheetMark - Convert Spreadsheets to Markdown Tables',
    description: 'A clean web app for converting spreadsheet data into Markdown table format.',
    url: 'https://sheetmark.app',
    siteName: 'SheetMark',
    images: [
      {
        url: 'https://placehold.co/1200x630/228B22/F5F5F5.png?text=SheetMark',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SheetMark - Convert Spreadsheets to Markdown Tables',
    description: 'Instantly convert spreadsheet data to Markdown tables. Paste or upload your file and get clean Markdown output.',
    images: ['https://placehold.co/1200x630/228B22/F5F5F5.png?text=SheetMark'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <NoFlashScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Space+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
