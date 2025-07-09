export function Footer() {
    return (
        <footer className="py-6 px-4 border-t mt-12">
            <div className="container mx-auto text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} SheetMark. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
}
