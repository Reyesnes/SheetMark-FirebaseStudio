"use client";

import React, { useState, useRef, useTransition } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Copy, ChevronsRight, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';

export function Converter() {
    const [inputData, setInputData] = useState('');
    const [markdownOutput, setMarkdownOutput] = useState('');
    const [isConverting, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleConversion = (data: string) => {
        if (!data.trim()) {
            setMarkdownOutput('');
            return;
        }

        startTransition(() => {
            try {
                const rows = data.trim().split('\n');
                if (rows.length === 0) {
                    setMarkdownOutput('');
                    return;
                }
                const separator = rows[0].includes('\t') ? '\t' : ',';
                const table = rows.map(row => row.split(separator).map(cell => cell.trim()));

                if (table.length === 0 || table[0].length === 0) {
                    setMarkdownOutput('');
                    return;
                }

                const header = table[0];
                const body = table.slice(1);

                let markdown = `| ${header.join(' | ')} |\n`;
                markdown += `| ${header.map(() => '---').join(' | ')} |\n`;
                
                body.forEach(row => {
                    const paddedRow = [...row];
                    while (paddedRow.length < header.length) {
                        paddedRow.push('');
                    }
                    markdown += `| ${paddedRow.slice(0, header.length).join(' | ')} |\n`;
                });

                setMarkdownOutput(markdown);
            } catch (error) {
                toast({
                    title: "Error de Conversión",
                    description: "No se pudieron procesar los datos. Verifique el formato.",
                    variant: "destructive"
                });
                setMarkdownOutput('');
            }
        });
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const data = e.target.value;
        setInputData(data);
        handleConversion(data);
    }

    const handleCopy = () => {
        if (!markdownOutput) {
            toast({ 
                title: "Nada que copiar", 
                description: "La salida está vacía.", 
                variant: "destructive"
            });
            return;
        }
        navigator.clipboard.writeText(markdownOutput);
        toast({ 
            title: "¡Copiado!", 
            description: "Tabla Markdown copiada al portapapeles." 
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'text/csv' && file.type !== 'text/plain' && !file.name.endsWith('.tsv')) {
                toast({
                    title: "Tipo de archivo no válido",
                    description: "Por favor, sube un archivo .csv o .tsv.",
                    variant: "destructive"
                });
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setInputData(text);
                handleConversion(text);
                toast({ 
                    title: "Archivo cargado",
                    description: `${file.name} ha sido cargado con éxito.` 
                });
            };
            reader.readAsText(file);
        }
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Datos de Entrada</span>
                        <Button variant="outline" size="sm" onClick={handleUploadClick}>
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Archivo
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".csv, .tsv, text/plain"
                        />
                    </CardTitle>
                    <CardDescription>Pega aquí los datos de tu hoja de cálculo o sube un archivo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="input-data" className="sr-only">Datos de Entrada</Label>
                    <Textarea
                        id="input-data"
                        value={inputData}
                        onChange={handleInputChange}
                        placeholder="Pega aquí los datos de tu hoja de cálculo (separados por comas o tabulaciones)..."
                        className="min-h-[300px] font-mono text-sm"
                        aria-label="Área de texto para datos de entrada"
                    />
                </CardContent>
            </Card>

            <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:left-0 md:-translate-x-1/2 z-10 flex items-center justify-center transform md:rotate-0 rotate-90">
                    <div className="p-2 bg-background rounded-full border shadow-md">
                        {isConverting ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        ) : (
                            <ChevronsRight className="h-6 w-6 text-muted-foreground" />
                        )}
                    </div>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Salida en Markdown</span>
                             <Button variant="default" size="sm" onClick={handleCopy} disabled={!markdownOutput || isConverting}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                            </Button>
                        </CardTitle>
                        <CardDescription>Aquí está tu tabla en formato Markdown.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="output-data" className="sr-only">Salida en Markdown</Label>
                        <Textarea
                            id="output-data"
                            value={markdownOutput}
                            readOnly
                            placeholder="Tu tabla Markdown aparecerá aquí..."
                            className="min-h-[300px] bg-muted/50 font-mono text-sm transition-opacity duration-300"
                            aria-label="Área de texto para salida en Markdown"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
