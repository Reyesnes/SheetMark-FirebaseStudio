import type { Metadata } from 'next';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import { NoFlashScript } from '@/components/no-flash';
import { getDictionary } from '@/lib/dictionaries';
import type { Locale } from '@/i18n-config';

export async function generateMetadata({ params: { lang } }: { params: { lang: Locale } }): Promise<Metadata> {
  const dictionary = await getDictionary(lang);
  return {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
    keywords: dictionary.metadata.keywords.split(', '),
    openGraph: {
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      url: 'https://sheetmark.app',
      siteName: 'SheetMark',
      images: [
        {
          url: 'https://placehold.co/1200x630/228B22/F5F5F5.png?text=SheetMark',
          width: 1200,
          height: 630,
        },
      ],
      locale: lang,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      images: ['https://placehold.co/1200x630/228B22/F5F5F5.png?text=SheetMark'],
    },
  };
}

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { lang: Locale };
}>) {
  return (
    <html lang={params.lang} suppressHydrationWarning>
      <head>
        <NoFlashScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Space+Mono&display=swap" rel="stylesheet" />
        <script
            data-name="BMC-Widget"
            data-cfasync="false"
            src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
            data-id="XTFyjwVSYV"
            data-description="Support me on Buy me a coffee!"
            data-message="Enjoying the tool? You can support my work with a coffee or a beer☕🍻🙂"
            data-color="#5F7FFF"
            data-position="Right"
            data-x_margin="18"
            data-y_margin="18"
        ></script>
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
