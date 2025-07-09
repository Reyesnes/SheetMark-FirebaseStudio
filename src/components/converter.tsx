
"use client";

import React, { useState, useRef, useTransition, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Copy, ChevronsRight, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Converter() {
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');
    const [isConverting, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const [outputType, setOutputType] = useState<'markdown' | 'csv'>('markdown');
    const [useDoubleQuotes, setUseDoubleQuotes] = useState(true);
    const [delimiter, setDelimiter] = useState(';');
    const [encoding, setEncoding] = useState('UTF-8');
    const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

    // Effect to re-decode file buffer when encoding changes
    useEffect(() => {
        if (fileBuffer) {
            try {
                const decoder = new TextDecoder(encoding);
                const text = decoder.decode(fileBuffer);
                setInputData(text);
            } catch (error) {
                toast({
                    title: "Error de Codificación",
                    description: `No se pudo decodificar el archivo con ${encoding}.`,
                    variant: "destructive"
                });
            }
        }
    }, [encoding, fileBuffer, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputData(e.target.value);
        // If user types, we are no longer working with the file buffer
        setFileBuffer(null); 
    };
    
    const parseInput = (data: string): string[][] => {
        if (!data.trim()) return [];
        const rows = data.trim().split('\n');
        
        const firstRow = rows[0] || '';
        const separators = [',', ';', '\t', '|', '/'];
        let detectedSeparator = ';';
        let maxCount = 0;

        for (const sep of separators) {
            const count = (firstRow.match(new RegExp(`\\${sep}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                detectedSeparator = sep;
            }
        }
        
        return rows.map(row => row.split(detectedSeparator).map(cell => {
            if (cell.startsWith('"') && cell.endsWith('"')) {
                return cell.slice(1, -1).replace(/""/g, '"');
            }
            return cell.trim();
        }));
    };

    const convertToMarkdown = (table: string[][]): string => {
        if (table.length === 0 || table[0].length === 0) return '';
        
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

        return markdown;
    };

    const convertToCsv = (table: string[][]): string => {
        if (table.length === 0) return '';

        const escapeCell = (cell: string) => {
            const needsQuotes = useDoubleQuotes || cell.includes(delimiter) || cell.includes('\n') || cell.includes('"');
            if (needsQuotes) {
                const escapedCell = cell.replace(/"/g, '""');
                return `"${escapedCell}"`;
            }
            return cell;
        };

        return table.map(row => 
            row.map(escapeCell).join(delimiter)
        ).join('\n');
    };

    useEffect(() => {
        startTransition(() => {
            if (!inputData.trim()) {
                setOutputData('');
                return;
            }
            try {
                const table = parseInput(inputData);
                if (outputType === 'markdown') {
                    setOutputData(convertToMarkdown(table));
                } else {
                    setOutputData(convertToCsv(table));
                }
            } catch (error) {
                toast({
                    title: "Error de Conversión",
                    description: "No se pudieron procesar los datos. Verifique el formato.",
                    variant: "destructive"
                });
                setOutputData('');
            }
        });
    }, [inputData, outputType, useDoubleQuotes, delimiter]);

    const handleCopy = () => {
        if (!outputData) {
            toast({ 
                title: "Nada que copiar", 
                description: "La salida está vacía.", 
                variant: "destructive"
            });
            return;
        }
        navigator.clipboard.writeText(outputData);
        toast({ 
            title: "¡Copiado!", 
            description: `Contenido ${outputType === 'markdown' ? 'Markdown' : 'CSV'} copiado al portapapeles.` 
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const buffer = event.target?.result as ArrayBuffer;
                if(buffer){
                    setFileBuffer(buffer); // This will trigger the useEffect for decoding
                     toast({ 
                        title: "Archivo cargado",
                        description: `${file.name} ha sido cargado con éxito.` 
                    });
                }
            };
            reader.onerror = () => {
                 toast({
                    title: "Error al leer el archivo",
                    description: "No se pudo leer el archivo seleccionado.",
                    variant: "destructive"
                });
            }
            reader.readAsArrayBuffer(file);
        }
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const outputDescription = outputType === 'markdown' 
        ? "Aquí está tu tabla en formato Markdown."
        : "Aquí están tus datos en formato CSV.";

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
                    <div className="p-2 bg-background rounded-full border">
                        {isConverting ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        ) : (
                            <ChevronsRight className="h-6 w-6 text-muted-foreground" />
                        )}
                    </div>
                </div>
                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                             <CardTitle>Salida</CardTitle>
                             <Button variant="default" size="sm" onClick={handleCopy} disabled={!outputData || isConverting}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                            </Button>
                        </div>
                        <CardDescription>{outputDescription}</CardDescription>
                        <Tabs value={outputType} onValueChange={(v) => setOutputType(v as 'markdown' | 'csv')} className="w-full pt-2">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                                <TabsTrigger value="csv">CSV</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent>
                        {outputType === 'csv' && (
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-4 p-4 border rounded-lg bg-card">
                                <div className="flex items-center space-x-2 pt-5 sm:pt-0 sm:items-end">
                                    <Checkbox id="double-quotes" checked={useDoubleQuotes} onCheckedChange={(checked) => setUseDoubleQuotes(!!checked)} />
                                    <Label htmlFor="double-quotes" className="cursor-pointer leading-none">Usar comillas dobles</Label>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="delimiter">Delimitador de Valor</Label>
                                    <Select value={delimiter} onValueChange={setDelimiter}>
                                        <SelectTrigger id="delimiter" className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=",">Comma (CSV) (,)</SelectItem>
                                            <SelectItem value="\t">Tab (TSV) (\t)</SelectItem>
                                            <SelectItem value=";">Semicolon (;) (Default)</SelectItem>
                                            <SelectItem value="|">Pipe (|)</SelectItem>
                                            <SelectItem value=":">Colon (:)</SelectItem>
                                            <SelectItem value="/">Slash (/)</SelectItem>
                                            <SelectItem value="#">Octothorpe (#)</SelectItem>
                                            <SelectItem value="~">Tilde (~)</SelectItem>
                                            <SelectItem value="-">Dash (-)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="encoding">Codificación</Label>
                                    <Select value={encoding} onValueChange={setEncoding}>
                                        <SelectTrigger id="encoding" className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UTF-8">UTF-8</SelectItem>
                                            <SelectItem value="ISO-8859-1">ISO-8859-1 (Latin1)</SelectItem>
                                            <SelectItem value="windows-1252">Windows-1252</SelectItem>
                                            <SelectItem value="UTF-16BE">UTF-16BE</SelectItem>
                                            <SelectItem value="UTF-16LE">UTF-16LE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        <Label htmlFor="output-data" className="sr-only">Salida</Label>
                        <Textarea
                            id="output-data"
                            value={outputData}
                            readOnly
                            placeholder={outputType === 'markdown' ? "Tu tabla Markdown aparecerá aquí..." : "Tus datos CSV aparecerán aquí..."}
                            className="min-h-[300px] bg-muted/50 font-mono text-sm transition-opacity duration-300"
                            aria-label="Área de texto para salida"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
