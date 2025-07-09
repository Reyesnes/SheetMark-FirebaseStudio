
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
import { Input } from '@/components/ui/input';

type ConverterProps = {
    dictionary: any;
}

export function Converter({ dictionary }: ConverterProps) {
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');
    const [isConverting, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Common State
    const [outputType, setOutputType] = useState<'markdown' | 'csv' | 'sql'>('markdown');
    const [encoding, setEncoding] = useState('UTF-8');
    const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

    // CSV State
    const [useDoubleQuotes, setUseDoubleQuotes] = useState(true);
    const [delimiter, setDelimiter] = useState(';');
    const [addBom, setAddBom] = useState(false);
    
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

    // SQL State
    const [createTable, setCreateTable] = useState(false);
    const [batchInsert, setBatchInsert] = useState(false);
    const [dropTable, setDropTable] = useState(false);
    const [databaseType, setDatabaseType] = useState('MySQL');
    const [tableName, setTableName] = useState('tableName');
    const [primaryKey, setPrimaryKey] = useState('');

    useEffect(() => {
        if (fileBuffer) {
            try {
                const decoder = new TextDecoder(encoding);
                const text = decoder.decode(fileBuffer);
                setInputData(text);
            } catch (error) {
                toast({
                    title: dictionary.toast.encodingErrorTitle,
                    description: dictionary.toast.encodingErrorDescription.replace('{encoding}', encoding),
                    variant: "destructive"
                });
            }
        }
    }, [encoding, fileBuffer, toast, dictionary]);

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
                processed = processed.replace(/\\n/g, '<br>');
            } else if (multilineHandling === 'escape') {
                processed = processed.replace(/\\n/g, '\\\\n');
            } else if (multilineHandling === 'break') {
                processed = processed.replace(/\\n/g, ' ');
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

        let csvContent = table.map(row => 
            row.map(escapeCell).join(delimiter)
        ).join('\n');

        if (addBom) {
            csvContent = '\uFEFF' + csvContent;
        }

        return csvContent;
    };
    
    const convertToSql = (tableData: string[][]): string => {
        if (!tableData || tableData.length === 0 || !tableData[0]) return '';
    
        const getIdentifierQuote = (dbType: string): [string, string] => {
            switch (dbType) {
                case 'MySQL':
                case 'MariaDB':
                case 'Amazon Redshift':
                case 'Amazon Athena':
                    return ['`', '`'];
                case 'PostgreSQL':
                case 'Oracle':
                    return ['"', '"'];
                case 'SQL Server':
                    return ['[', ']'];
                case 'SQLite':
                case 'IBM DB2':
                default:
                    return ['"', '"']; // ANSI standard
            }
        };
    
        const escapeSqlValue = (value: string): string => {
            if (value === null || value === undefined) return 'NULL';
            return `'${value.replace(/'/g, "''")}'`;
        };
    
        const [qS, qE] = getIdentifierQuote(databaseType);
        const effectiveTableName = `${qS}${tableName || 'my_table'}${qE}`;
    
        const header = firstHeader ? tableData[0] : tableData[0].map((_, i) => `column_${i + 1}`);
        const body = firstHeader ? tableData.slice(1) : tableData;
    
        if (body.length === 0 && !createTable) return '';
    
        const quotedHeader = header.map(h => `${qS}${h}${qE}`);
        let sqlOutput = [];
    
        if (dropTable) {
            sqlOutput.push(`DROP TABLE IF EXISTS ${effectiveTableName};`);
        }
    
        if (createTable) {
            const columnDefs = header.map(colName => {
                const quotedColName = `${qS}${colName}${qE}`;
                let dataType = 'VARCHAR(255)';
                switch(databaseType) {
                    case 'PostgreSQL':
                    case 'SQLite':
                    case 'Oracle':
                    case 'IBM DB2':
                    case 'Amazon Redshift':
                    case 'Amazon Athena':
                        dataType = 'TEXT';
                        break;
                    case 'SQL Server':
                        dataType = 'NVARCHAR(255)';
                        break;
                }
                return `${quotedColName} ${dataType}`;
            });
    
            if (primaryKey && header.includes(primaryKey)) {
                columnDefs.push(`PRIMARY KEY (${qS}${primaryKey}${qE})`);
            }
    
            sqlOutput.push(`CREATE TABLE ${effectiveTableName} (\n  ${columnDefs.join(',\n  ')}\n);`);
        }
    
        if (body.length > 0) {
            const insertPrefix = `INSERT INTO ${effectiveTableName} (${quotedHeader.join(', ')}) VALUES`;
    
            if (batchInsert) {
                const allValues = body
                    .filter(row => row.length === header.length)
                    .map(row => `(${row.map(escapeSqlValue).join(', ')})`)
                    .join(',\n');
                if (allValues) {
                    sqlOutput.push(`${insertPrefix}\n${allValues};`);
                }
            } else {
                const insertStatements = body
                    .filter(row => row.length === header.length)
                    .map(row => `${insertPrefix} (${row.map(escapeSqlValue).join(', ')});`);
                sqlOutput.push(...insertStatements);
            }
        }
    
        return sqlOutput.join('\n\n');
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
                } else if (outputType === 'csv') {
                    setOutputData(convertToCsv(table));
                } else if (outputType === 'sql') {
                    setOutputData(convertToSql(table));
                }
            } catch (error) {
                console.error("Conversion Error:", error);
                toast({
                    title: dictionary.toast.conversionErrorTitle,
                    description: dictionary.toast.conversionErrorDescription,
                    variant: "destructive"
                });
                setOutputData('');
            }
        });
    }, [inputData, outputType, useDoubleQuotes, delimiter, addBom, escapeChars, firstHeader, prettyMarkdown, simpleMarkdown, addLineNumbers, boldFirstRow, boldFirstColumn, textAlign, multilineHandling, createTable, batchInsert, dropTable, databaseType, tableName, primaryKey]);


    const handleCopy = () => {
        if (!outputData) {
            toast({ 
                title: dictionary.toast.nothingToCopyTitle, 
                description: dictionary.toast.nothingToCopyDescription, 
                variant: "destructive"
            });
            return;
        }
        navigator.clipboard.writeText(outputData);
        let description = '';
        if (outputType === 'markdown') description = dictionary.toast.copiedDescriptionMarkdown;
        else if (outputType === 'csv') description = dictionary.toast.copiedDescriptionCsv;
        else if (outputType === 'sql') description = dictionary.toast.copiedDescriptionSql;

        toast({ 
            title: dictionary.toast.copiedTitle, 
            description
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
                        title: dictionary.toast.fileUploadedTitle,
                        description: dictionary.toast.fileUploadedDescription.replace('{fileName}', file.name)
                    });
                }
            };
            reader.onerror = () => {
                 toast({
                    title: dictionary.toast.fileReadErrorTitle,
                    description: dictionary.toast.fileReadErrorDescription,
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
        ? dictionary.outputDescriptionMarkdown
        : outputType === 'csv'
        ? dictionary.outputDescriptionCsv
        : dictionary.outputDescriptionSql;
        
    const outputPlaceholder = outputType === 'markdown' 
        ? dictionary.outputPlaceholderMarkdown
        : outputType === 'csv'
        ? dictionary.outputPlaceholderCsv
        : dictionary.outputPlaceholderSql;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{dictionary.inputCardTitle}</span>
                        <Button variant="outline" size="sm" onClick={handleUploadClick}>
                            <Upload className="mr-2 h-4 w-4" />
                            {dictionary.uploadButton}
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".csv, .tsv, text/plain, .xlsx, .xls"
                        />
                    </CardTitle>
                    <CardDescription>{dictionary.inputCardDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="input-data" className="sr-only">{dictionary.inputCardTitle}</Label>
                    <Textarea
                        id="input-data"
                        value={inputData}
                        onChange={handleInputChange}
                        placeholder={dictionary.inputPlaceholder}
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
                             <CardTitle>{dictionary.outputCardTitle}</CardTitle>
                             <div className="flex items-center gap-2">
                                <Button variant="default" size="sm" onClick={handleCopy} disabled={!outputData || isConverting}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    {dictionary.copyButton}
                                </Button>
                                <a href="https://bit.ly/44EVg9i" target="_blank" rel="noopener noreferrer">
                                    <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a beer&emoji=🍺&slug=xtfyjwvsyv&button_colour=3b82f6&font_colour=ffffff&font_family=Bree&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a beer" className="h-9" />
                                </a>
                             </div>
                        </div>
                        <CardDescription>{outputDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-1.5 mb-4">
                            <Label htmlFor="encoding">{dictionary.encodingLabel}</Label>
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
                                    <SelectItem value="Shift_JIS">Shift_JIS (Japanese)</SelectItem>
                                    <SelectItem value="EUC-KR">EUC-KR (Korean)</SelectItem>
                                    <SelectItem value="GBK">GBK (Simplified Chinese)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">{dictionary.encodingDescription}</p>
                        </div>

                        <Tabs value={outputType} onValueChange={(v) => setOutputType(v as 'markdown' | 'csv' | 'sql')} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="markdown">{dictionary.outputTypeMarkdown}</TabsTrigger>
                                <TabsTrigger value="csv">{dictionary.outputTypeCsv}</TabsTrigger>
                                <TabsTrigger value="sql">{dictionary.outputTypeSql}</TabsTrigger>
                            </TabsList>
                            {outputType === 'markdown' && (
                            <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                                <p className="text-sm font-medium">{dictionary.markdownOptionsTitle}</p>
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="flex items-center space-x-2">
                                            <Checkbox id="first-header" checked={firstHeader} onCheckedChange={(c) => setFirstHeader(!!c)} />
                                            <Label htmlFor="first-header">{dictionary.firstHeader}</Label>
                                    </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="pretty-markdown" checked={prettyMarkdown} onCheckedChange={(c) => { setPrettyMarkdown(!!c); if(c) setSimpleMarkdown(false); }} />
                                            <Label htmlFor="pretty-markdown">{dictionary.prettyMarkdown}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                            <Checkbox id="simple-markdown" checked={simpleMarkdown} onCheckedChange={(c) => { setSimpleMarkdown(!!c); if(c) setPrettyMarkdown(false); }} />
                                            <Label htmlFor="simple-markdown">{dictionary.simpleMarkdown}</Label>
                                    </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="add-line-numbers" checked={addLineNumbers} onCheckedChange={(c) => setAddLineNumbers(!!c)} />
                                            <Label htmlFor="add-line-numbers">{dictionary.addLineNumbers}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                            <Checkbox id="bold-first-row" checked={boldFirstRow} onCheckedChange={(c) => setBoldFirstRow(!!c)} />
                                            <Label htmlFor="bold-first-row">{dictionary.boldFirstRow}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                            <Checkbox id="bold-first-column" checked={boldFirstColumn} onCheckedChange={(c) => setBoldFirstColumn(!!c)} />
                                            <Label htmlFor="bold-first-column">{dictionary.boldFirstColumn}</Label>
                                    </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="escape-chars" checked={escapeChars} onCheckedChange={(c) => setEscapeChars(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="escape-chars" className="cursor-pointer">{dictionary.escapeChars}</Label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{dictionary.escapeCharsTooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                    </div>
                                </div>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="text-align">{dictionary.textAlign}</Label>
                                            <Select value={textAlign} onValueChange={setTextAlign}>
                                                <SelectTrigger id="text-align" className="bg-background"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="left">{dictionary.alignLeft}</SelectItem>
                                                    <SelectItem value="center">{dictionary.alignCenter}</SelectItem>
                                                    <SelectItem value="right">{dictionary.alignRight}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="multiline">{dictionary.multiline}</Label>
                                            <Select value={multilineHandling} onValueChange={setMultilineHandling}>
                                                <SelectTrigger id="multiline" className="bg-background"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="preserve">{dictionary.multilinePreserve}</SelectItem>
                                                    <SelectItem value="escape">{dictionary.multilineEscape}</SelectItem>
                                                    <SelectItem value="break">{dictionary.multilineBreak}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                </div>
                            </div>
                            )}

                            {outputType === 'csv' && (
                            <div className="mt-4 p-4 border rounded-lg bg-card">
                                    <p className="text-sm font-medium mb-4">{dictionary.csvOptionsTitle}</p>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="double-quotes" checked={useDoubleQuotes} onCheckedChange={(checked) => setUseDoubleQuotes(!!checked)} />
                                            <Label htmlFor="double-quotes" className="cursor-pointer leading-none">{dictionary.useDoubleQuotes}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="add-bom" checked={addBom} onCheckedChange={(c) => setAddBom(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="add-bom" className="cursor-pointer leading-none">{dictionary.addBom}</Label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{dictionary.addBomTooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="delimiter">{dictionary.delimiter}</Label>
                                            <Select value={delimiter} onValueChange={setDelimiter}>
                                                <SelectTrigger id="delimiter" className="bg-background"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value=";">{dictionary.delimiterSemicolon}</SelectItem>
                                                    <SelectItem value=",">{dictionary.delimiterComma}</SelectItem>
                                                    <SelectItem value="\t">{dictionary.delimiterTab}</SelectItem>
                                                    <SelectItem value="|">{dictionary.delimiterPipe}</SelectItem>
                                                    <SelectItem value=" ">{dictionary.delimiterSpace}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {outputType === 'sql' && (
                                <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                                    <p className="text-sm font-medium">{dictionary.sql.sqlOptionsTitle}</p>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="create-table" checked={createTable} onCheckedChange={(c) => setCreateTable(!!c)} />
                                            <Label htmlFor="create-table">{dictionary.sql.createTable}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="batch-insert" checked={batchInsert} onCheckedChange={(c) => setBatchInsert(!!c)} />
                                            <Label htmlFor="batch-insert">{dictionary.sql.batchInsert}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="drop-table" checked={dropTable} onCheckedChange={(c) => setDropTable(!!c)} />
                                            <Label htmlFor="drop-table">{dictionary.sql.dropTable}</Label>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="db-type">{dictionary.sql.databaseType}</Label>
                                            <Select value={databaseType} onValueChange={setDatabaseType}>
                                                <SelectTrigger id="db-type" className="bg-background"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MySQL">MySQL</SelectItem>
                                                    <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                                                    <SelectItem value="SQLite">SQLite</SelectItem>
                                                    <SelectItem value="SQL Server">SQL Server</SelectItem>
                                                    <SelectItem value="Oracle">Oracle</SelectItem>
                                                    <SelectItem value="MariaDB">MariaDB</SelectItem>
                                                    <SelectItem value="Amazon Redshift">Amazon Redshift</SelectItem>
                                                    <SelectItem value="IBM DB2">IBM DB2</SelectItem>
                                                    <SelectItem value="Amazon Athena">Amazon Athena</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="table-name">{dictionary.sql.tableName}</Label>
                                            <Input id="table-name" value={tableName} onChange={(e) => setTableName(e.target.value)} />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="primary-key">{dictionary.sql.primaryKey}</Label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{dictionary.sql.primaryKeyTooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <Input id="primary-key" value={primaryKey} onChange={(e) => setPrimaryKey(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Tabs>

                        <div className="mt-4">
                            <Label htmlFor="output-data" className="sr-only">{dictionary.outputCardTitle}</Label>
                            <Textarea
                                id="output-data"
                                value={outputData}
                                readOnly
                                placeholder={outputPlaceholder}
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
