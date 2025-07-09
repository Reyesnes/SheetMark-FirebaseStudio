
"use client";

import React, { useState, useRef, useTransition, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Copy, ChevronsRight, Loader2, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Converter() {
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');
    const [isConverting, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Common State
    const [outputType, setOutputType] = useState<'markdown' | 'csv'>('markdown');
    const [encoding, setEncoding] = useState('UTF-8');
    const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

    // CSV State
    const [useDoubleQuotes, setUseDoubleQuotes] = useState(true);
    const [delimiter, setDelimiter] = useState(';');
    
    // Markdown State
    const [escapeChars, setEscapeChars] = useState(false);
    const [firstHeader, setFirstHeader] = useState(true);
    const [prettyMarkdown, setPrettyMarkdown] = useState(true);
    const [simpleMarkdown, setSimpleMarkdown] = useState(false);
    const [addLineNumbers, setAddLineNumbers] = useState(false);
    const [boldFirstRow, setBoldFirstRow] = useState(false);
    const [boldFirstColumn, setBoldFirstColumn] = useState(false);
    const [textAlign, setTextAlign] = useState('left');
    const [multilineHandling, setMultilineHandling] = useState('preserve');

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

    const convertToMarkdown = (tableData: string[][]): string => {
        if (!tableData || tableData.length === 0 || !tableData[0] || tableData[0].length === 0) return '';
    
        let table = JSON.parse(JSON.stringify(tableData));
    
        const processCell = (content: string): string => {
            let processed = content || '';
            if (multilineHandling === 'preserve') {
                processed = processed.replace(/\n/g, '<br>');
            } else if (multilineHandling === 'escape') {
                processed = processed.replace(/\n/g, '\\n');
            } else if (multilineHandling === 'break') {
                processed = processed.replace(/\n/g, ' ');
            }
            if (escapeChars) {
                processed = processed.replace(/\|/g, '\\|');
            }
            return processed;
        };
    
        table = table.map(row => row.map(processCell));
    
        let effectiveHeader = firstHeader;
        if (addLineNumbers) {
            if (firstHeader) {
                const headerWithNum = ['#', ...table[0]];
                const bodyWithNum = table.slice(1).map((r, i) => [String(i + 1), ...r]);
                table = [headerWithNum, ...bodyWithNum];
            } else {
                const headerWithNum = ['#', ...Array(table[0].length).fill('')];
                const bodyWithNum = table.map((r, i) => [String(i + 1), ...r]);
                table = [headerWithNum, ...bodyWithNum];
                effectiveHeader = true;
            }
        }
    
        let header = effectiveHeader ? table[0] : Array(table[0].length).fill('');
        let body = effectiveHeader ? table.slice(1) : table;
    
        if (boldFirstRow) {
            header = header.map(cell => `**${cell}**`);
        }
    
        if (boldFirstColumn) {
            if (header.length > 0) header[0] = `**${header[0]}**`;
            body = body.map(row => {
                if (row.length > 0) {
                    const newRow = [...row];
                    newRow[0] = `**${newRow[0]}**`;
                    return newRow;
                }
                return row;
            });
        }
    
        const allRows = [header, ...body];
        const colWidths = Array(header.length).fill(0).map((_, i) => 
            Math.max(3, ...allRows.map(row => (row[i] || '').length))
        );
    
        const getSeparator = (align: string, width: number) => {
            const useWidth = prettyMarkdown ? width : 3;
            if (align === 'center') return `:${'-'.repeat(Math.max(1, useWidth - 2))}:`;
            if (align === 'right') return `${'-'.repeat(Math.max(1, useWidth - 1))}:`;
            return '-'.repeat(useWidth);
        };
    
        const buildRow = (row: string[]) => {
            const fullRow = [...row];
            while (fullRow.length < header.length) fullRow.push('');
            return `| ${fullRow.map((cell, i) => (cell || '').padEnd(prettyMarkdown ? colWidths[i] : 0)).join(' | ')} |`;
        };
    
        const headerLine = buildRow(header);
        const separatorLine = `| ${colWidths.map((w, i) => getSeparator(textAlign, w)).join(' | ')} |`;
        const bodyLines = body.map(buildRow).join('\n');
    
        return [headerLine, separatorLine, bodyLines].join('\n');
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
                console.error("Conversion Error:", error);
                toast({
                    title: "Error de Conversión",
                    description: "No se pudieron procesar los datos. Verifique el formato.",
                    variant: "destructive"
                });
                setOutputData('');
            }
        });
    }, [inputData, outputType, useDoubleQuotes, delimiter, escapeChars, firstHeader, prettyMarkdown, simpleMarkdown, addLineNumbers, boldFirstRow, boldFirstColumn, textAlign, multilineHandling]);


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
                    setFileBuffer(buffer);
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
                            accept=".csv, .tsv, text/plain, .xlsx, .xls"
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
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-1.5 mb-4">
                            <Label htmlFor="encoding">Codificación de Archivo (Entrada)</Label>
                            <Select value={encoding} onValueChange={setEncoding}>
                                <SelectTrigger id="encoding" className="bg-background w-full sm:max-w-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTF-8">UTF-8</SelectItem>
                                    <SelectItem value="ISO-8859-1">ISO-8859-1 (Latin 1)</SelectItem>
                                    <SelectItem value="windows-1252">Windows-1252</SelectItem>
                                    <SelectItem value="UTF-16BE">UTF-16BE</SelectItem>
                                    <SelectItem value="UTF-16LE">UTF-16LE</SelectItem>
                                    <SelectItem value="ISO-8859-15">ISO-8859-15</SelectItem>
                                    <SelectItem value="macintosh">MacRoman</SelectItem>
                                    <SelectItem value="windows-1251">Windows-1251 (Cyrillic)</SelectItem>
                                    <SelectItem value="Shift_JIS">Shift_JIS (Japonés)</SelectItem>
                                    <SelectItem value="EUC-KR">EUC-KR (Coreano)</SelectItem>
                                    <SelectItem value="GBK">GBK (Chino Simplificado)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Afecta a archivos subidos. Si ves '', prueba otra opción.</p>
                        </div>

                        <Tabs value={outputType} onValueChange={(v) => setOutputType(v as 'markdown' | 'csv')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                                <TabsTrigger value="csv">CSV</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {outputType === 'markdown' && (
                           <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                               <p className="text-sm font-medium">Opciones de Salida Markdown</p>
                               <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                   <div className="flex items-center space-x-2">
                                        <Checkbox id="first-header" checked={firstHeader} onCheckedChange={(c) => setFirstHeader(!!c)} />
                                        <Label htmlFor="first-header">Primera Fila como Encabezado</Label>
                                   </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="pretty-markdown" checked={prettyMarkdown} onCheckedChange={(c) => { setPrettyMarkdown(!!c); if(c) setSimpleMarkdown(false); }} />
                                        <Label htmlFor="pretty-markdown">Tabla Markdown Estilizada</Label>
                                   </div>
                                   <div className="flex items-center space-x-2">
                                        <Checkbox id="simple-markdown" checked={simpleMarkdown} onCheckedChange={(c) => { setSimpleMarkdown(!!c); if(c) setPrettyMarkdown(false); }} />
                                        <Label htmlFor="simple-markdown">Formato Markdown Simple</Label>
                                   </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="add-line-numbers" checked={addLineNumbers} onCheckedChange={(c) => setAddLineNumbers(!!c)} />
                                        <Label htmlFor="add-line-numbers">Añadir Números de Fila</Label>
                                   </div>
                                   <div className="flex items-center space-x-2">
                                        <Checkbox id="bold-first-row" checked={boldFirstRow} onCheckedChange={(c) => setBoldFirstRow(!!c)} />
                                        <Label htmlFor="bold-first-row">Negrita en Primera Fila</Label>
                                   </div>
                                   <div className="flex items-center space-x-2">
                                        <Checkbox id="bold-first-column" checked={boldFirstColumn} onCheckedChange={(c) => setBoldFirstColumn(!!c)} />
                                        <Label htmlFor="bold-first-column">Negrita en Primera Columna</Label>
                                   </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="escape-chars" checked={escapeChars} onCheckedChange={(c) => setEscapeChars(!!c)} />
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="escape-chars" className="cursor-pointer">Escapar Caracteres</Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Escapa caracteres especiales como '|' para<br/>evitar que se rompa la tabla.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                   </div>
                               </div>
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="text-align">Alineación de Texto</Label>
                                        <Select value={textAlign} onValueChange={setTextAlign}>
                                            <SelectTrigger id="text-align" className="bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="left">Izquierda</SelectItem>
                                                <SelectItem value="center">Centro</SelectItem>
                                                <SelectItem value="right">Derecha</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="multiline">Manejo Multilínea</Label>
                                        <Select value={multilineHandling} onValueChange={setMultilineHandling}>
                                            <SelectTrigger id="multiline" className="bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="preserve">Preservar (&lt;br&gt;)</SelectItem>
                                                <SelectItem value="escape">Escapar (\\n)</SelectItem>
                                                <SelectItem value="break">Romper Líneas (espacio)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                               </div>
                           </div>
                        )}

                        {outputType === 'csv' && (
                           <div className="mt-4 p-4 border rounded-lg bg-card">
                                <p className="text-sm font-medium mb-4">Opciones de Salida CSV</p>
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="double-quotes" checked={useDoubleQuotes} onCheckedChange={(checked) => setUseDoubleQuotes(!!checked)} />
                                        <Label htmlFor="double-quotes" className="cursor-pointer leading-none">Usar comillas dobles</Label>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="delimiter">Delimitador</Label>
                                        <Select value={delimiter} onValueChange={setDelimiter}>
                                            <SelectTrigger id="delimiter" className="bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=";">Punto y coma (;)</SelectItem>
                                                <SelectItem value=",">Coma (,)</SelectItem>
                                                <SelectItem value="\t">Tabulación (\t)</SelectItem>
                                                <SelectItem value="|">Barra vertical (|)</SelectItem>
                                                <SelectItem value=" ">Espacio</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-4">
                            <Label htmlFor="output-data" className="sr-only">Salida</Label>
                            <Textarea
                                id="output-data"
                                value={outputData}
                                readOnly
                                placeholder={outputType === 'markdown' ? "Tu tabla Markdown aparecerá aquí..." : "Tus datos CSV aparecerán aquí..."}
                                className="min-h-[300px] bg-muted/50 font-mono text-sm transition-opacity duration-300"
                                aria-label="Área de texto para salida"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
