type FooterProps = {
    dictionary: {
        copyright: string;
        buyMeAPizza: string;
    }
}

export function Footer({ dictionary }: FooterProps) {
    return (
        <footer className="py-6 px-4 border-t mt-12">
            <div className="container mx-auto text-center text-sm text-muted-foreground flex flex-col gap-2">
                <p>
                    <a href="https://bit.ly/44EVg9i" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        🍕 {dictionary.buyMeAPizza}
                    </a>
                </p>
                <p>{dictionary.copyright.replace('{year}', new Date().getFullYear().toString())}</p>
            </div>
        </footer>
    );
}

    