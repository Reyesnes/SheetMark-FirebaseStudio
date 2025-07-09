import { Converter } from "@/components/converter";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 tracking-tight">
              Convierte Hojas de Cálculo a Markdown
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Pega tus datos o sube un archivo CSV/TSV y obtén una tabla Markdown al instante.
            </p>
        </div>
        <Converter />
      </main>
      <Footer />
    </div>
  );
}
