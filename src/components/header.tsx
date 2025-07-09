import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { Coffee } from 'lucide-react';

export function Header() {
    return (
        <header className="py-4 px-4 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold font-headline text-primary">SheetMark</h1>
                <div className="flex items-center gap-2 md:gap-4">
                    <Button asChild variant="ghost" className="hidden sm:inline-flex">
                        <a href="https://www.buymeacoffee.com/placeholder" target="_blank" rel="noopener noreferrer">
                            <Coffee className="mr-2 h-4 w-4" /> Invitame a un Café
                        </a>
                    </Button>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
