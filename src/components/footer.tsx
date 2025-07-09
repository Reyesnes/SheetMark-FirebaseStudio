type FooterProps = {
    dictionary: {
        copyright: string;
    }
}

export function Footer({ dictionary }: FooterProps) {
    return (
        <footer className="py-6 px-4 border-t mt-12">
            <div className="container mx-auto text-center text-sm text-muted-foreground">
                <p>{dictionary.copyright.replace('{year}', new Date().getFullYear().toString())}</p>
            </div>
        </footer>
    );
}
