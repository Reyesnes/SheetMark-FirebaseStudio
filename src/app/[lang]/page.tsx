import { Converter } from "@/components/converter";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n-config";

export default async function Home({ params: { lang } }: { params: { lang: Locale } }) {
  const dictionary = await getDictionary(lang);
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header dictionary={dictionary.header} />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-sans mb-4 tracking-tight">
              {dictionary.page.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              {dictionary.page.description}
            </p>
        </div>
        <Converter dictionary={dictionary.converter} />
      </main>
      <Footer dictionary={dictionary.footer} />
    </div>
  );
}
