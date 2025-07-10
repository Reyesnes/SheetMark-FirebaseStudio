"use client";

import React, { useState, useRef, useTransition, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Copy, ChevronsRight, Loader2, Info, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

type ConverterProps = {
    dictionary: any;
}

export function Converter({ dictionary }: ConverterProps) {
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');
    const [isConverting, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imagePreviewRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Common State
    const [outputType, setOutputType] = useState<'markdown' | 'csv' | 'sql' | 'html' | 'json' | 'png'>('markdown');
    const [encoding, setEncoding] = useState('UTF-8');
    const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
    const [firstHeader, setFirstHeader] = useState(true);

    // CSV State
    const [useDoubleQuotes, setUseDoubleQuotes] = useState(true);
    const [delimiter, setDelimiter] = useState(';');
    const [addBom, setAddBom] = useState(false);
    
    // Markdown State
    const [escapeChars, setEscapeChars] = useState(false);
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

    // HTML State
    const [useDivTable, setUseDivTable] = useState(false);
    const [minifyCode, setMinifyCode] = useState(false);
    const [useTableHeadStructure, setUseTableHeadStructure] = useState(true);
    const [useTableCaption, setUseTableCaption] = useState(false);
    const [tableCaptionText, setTableCaptionText] = useState('My Table Caption');
    const [tableClass, setTableClass] = useState('');
    const [tableId, setTableId] = useState('');

    // JSON State
    const [jsonFormat, setJsonFormat] = useState('array_objects'); // array_objects, array_arrays, object_objects
    const [minifyJson, setMinifyJson] = useState(false);

    // PNG State
    const [pngTheme, setPngTheme] = useState('light');
    const [pngPadding, setPngPadding] = useState([16]);
    const [pngCellPadding, setPngCellPadding] = useState([8]);
    const [pngFontSize, setPngFontSize] = useState([14]);
    const [pngShowBorders, setPngShowBorders] = useState(true);
    const [pngBoldHeader, setPngBoldHeader] = useState(true);
    const [pngFontFamily, setPngFontFamily] = useState('sans-serif');
    const [pngBgColor, setPngBgColor] = useState('#ffffff');


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

    useEffect(() => {
        if (pngTheme === 'light') {
            setPngBgColor('#ffffff');
        } else {
            setPngBgColor('#333333');
        }
    }, [pngTheme]);

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

    const convertToHtml = (tableData: string[][]): string => {
        if (!tableData || tableData.length === 0 || !tableData[0]) return '';

        const nl = minifyCode ? '' : '\n';
        const indent = minifyCode ? '' : '  ';

        const headerRow = firstHeader ? tableData[0] : [];
        const bodyRows = firstHeader ? tableData.slice(1) : tableData;

        const renderRow = (row: string[], cellType: 'th' | 'td') => {
            const cells = row.map(cell => `${indent.repeat(2)}<${cellType}>${cell}</${cellType}>`).join(nl);
            return `${indent}<tr>${nl}${cells}${nl}${indent}</tr>`;
        };
        
        const renderDivRow = (row: string[], isHeader: boolean) => {
            const cellClass = isHeader ? ' class="table-header-cell"' : ' class="table-cell"';
            const cells = row.map(cell => `${indent.repeat(2)}<div${cellClass}>${cell}</div>`).join(nl);
            return `${indent}<div class="table-row">${nl}${cells}${nl}${indent}</div>`;
        }

        if (useDivTable) {
            const tableAttrs = [];
            if (tableId) tableAttrs.push(`id="${tableId}"`);
            if (tableClass) tableAttrs.push(`class="table ${tableClass}"`);

            let html = `<div ${tableAttrs.join(' ')}>${nl}`;
            if (useTableCaption && tableCaptionText) {
                html += `${indent}<div class="table-caption">${tableCaptionText}</div>${nl}`;
            }

            if (firstHeader && headerRow.length > 0) {
                if (useTableHeadStructure) {
                    html += `${indent}<div class="table-header">${nl}${renderDivRow(headerRow, true)}${nl}${indent}</div>${nl}`;
                } else {
                    html += renderDivRow(headerRow, true) + nl;
                }
            }
            
            const bodyContent = bodyRows.map(row => renderDivRow(row, false)).join(nl);
            if(useTableHeadStructure && bodyRows.length > 0) {
                 html += `${indent}<div class="table-body">${nl}${bodyContent}${nl}${indent}</div>${nl}`;
            } else if (bodyRows.length > 0) {
                html += bodyContent + nl;
            }

            html += `</div>`;
            return html;
        }

        // Standard table generation
        const tableAttrs = [];
        if (tableId) tableAttrs.push(`id="${tableId}"`);
        if (tableClass) tableAttrs.push(`class="${tableClass}"`);

        let html = `<table ${tableAttrs.join(' ')}>${nl}`;
        if (useTableCaption && tableCaptionText) {
            html += `${indent}<caption>${tableCaptionText}</caption>${nl}`;
        }

        if (firstHeader && headerRow.length > 0) {
            const headContent = renderRow(headerRow, 'th');
            if(useTableHeadStructure){
                html += `<thead>${nl}${headContent}${nl}</thead>${nl}`;
            } else {
                html += headContent + nl;
            }
        }
        
        const bodyContent = bodyRows.map(row => renderRow(row, 'td')).join(nl);
        if(useTableHeadStructure && bodyRows.length > 0) {
             html += `<tbody>${nl}${bodyContent}${nl}</tbody>${nl}`;
        } else if (bodyRows.length > 0) {
            html += bodyContent + nl;
        }

        html += `</table>`;
        return html;
    };
    
    const convertToJson = (tableData: string[][]): string => {
        if (!tableData || tableData.length === 0) return minifyJson ? '{}' : '{\n}';
        const header = firstHeader ? tableData[0] : tableData[0].map((_, i) => `column_${i + 1}`);
        const body = firstHeader ? tableData.slice(1) : tableData;
        
        let result: any;

        switch (jsonFormat) {
            case 'array_objects':
                result = body.map(row => {
                    const obj: { [key: string]: string } = {};
                    header.forEach((key, i) => {
                        obj[key] = row[i];
                    });
                    return obj;
                });
                break;
            case 'array_arrays':
                result = firstHeader ? tableData : [header, ...body];
                break;
            case 'object_objects':
                result = {};
                body.forEach((row, rowIndex) => {
                    const obj: { [key: string]: string } = {};
                    header.forEach((key, i) => {
                        obj[key] = row[i];
                    });
                    result[`row_${rowIndex + 1}`] = obj;
                });
                break;
            default:
                result = [];
        }

        return JSON.stringify(result, null, minifyJson ? 0 : 2);
    };

    const convertToPng = async (): Promise<string> => {
        if (!imagePreviewRef.current) return '';
        
        const node = imagePreviewRef.current;
        try {
            // Re-trigger styles before capturing
            if (node.style.fontFamily !== pngFontFamily) node.style.fontFamily = pngFontFamily;
            if (node.style.backgroundColor !== pngBgColor) node.style.backgroundColor = pngBgColor;

            const dataUrl = await htmlToImage.toPng(node, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: pngBgColor,
                 style: {
                    margin: '0',
                    fontFamily: pngFontFamily
                }
            });
            return dataUrl;
        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast({
                title: dictionary.toast.conversionErrorTitle,
                description: dictionary.png.conversionError,
                variant: "destructive"
            });
            return '';
        }
    };

    const performConversion = async () => {
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
            } else if (outputType === 'html') {
                setOutputData(convertToHtml(table));
            } else if (outputType === 'json') {
                setOutputData(convertToJson(table));
            } else if (outputType === 'png') {
                 // Trigger PNG conversion, which will update state
                 const pngDataUrl = await convertToPng();
                 setOutputData(pngDataUrl);
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
    };


    useEffect(() => {
        startTransition(() => {
            performConversion();
        });
    }, [
        inputData, outputType, useDoubleQuotes, delimiter, addBom, escapeChars, firstHeader, 
        prettyMarkdown, simpleMarkdown, addLineNumbers, boldFirstRow, boldFirstColumn, textAlign, 
        multilineHandling, createTable, batchInsert, dropTable, databaseType, tableName, primaryKey, 
        useDivTable, minifyCode, useTableHeadStructure, useTableCaption, tableCaptionText, tableClass, tableId,
        jsonFormat, minifyJson, pngTheme, pngPadding, pngFontSize, pngShowBorders, pngBgColor,
        pngCellPadding, pngBoldHeader, pngFontFamily
    ]);


    const handleCopy = () => {
        if (!outputData) {
            toast({ 
                title: dictionary.toast.nothingToCopyTitle, 
                description: dictionary.toast.nothingToCopyDescription, 
                variant: "destructive"
            });
            return;
        }
        if (outputType === 'png') {
             toast({
                title: dictionary.png.copyNotSupportedTitle,
                description: dictionary.png.copyNotSupportedDescription,
                variant: "destructive"
            });
            return;
        }

        navigator.clipboard.writeText(outputData);
        let description = '';
        if (outputType === 'markdown') description = dictionary.toast.copiedDescriptionMarkdown;
        else if (outputType === 'csv') description = dictionary.toast.copiedDescriptionCsv;
        else if (outputType === 'sql') description = dictionary.toast.copiedDescriptionSql;
        else if (outputType === 'html') description = dictionary.toast.copiedDescriptionHtml;
        else if (outputType === 'json') description = dictionary.toast.copiedDescriptionJson;


        toast({ 
            title: dictionary.toast.copiedTitle, 
            description
        });
    };

    const handleDownload = () => {
        if (!outputData) {
            toast({ 
                title: dictionary.toast.nothingToCopyTitle, // Re-use toast message
                description: dictionary.toast.nothingToCopyDescription, 
                variant: "destructive"
            });
            return;
        }

        const fileExtensionMap = {
            markdown: 'md',
            csv: 'csv',
            sql: 'sql',
            html: 'html',
            json: 'json',
            png: 'png'
        };
        const fileExtension = fileExtensionMap[outputType];
        const fileName = `sheetmark_output.${fileExtension}`;
        
        const link = document.createElement('a');

        if (outputType === 'png') {
            link.href = outputData;
        } else {
            const blob = new Blob([outputData], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            link.href = url;
        }
        
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (outputType !== 'png') {
            URL.revokeObjectURL(link.href);
        }

        toast({
            title: dictionary.toast.downloadedTitle,
            description: dictionary.toast.downloadedDescription.replace('{fileName}', fileName)
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

    const outputDescription = {
        markdown: dictionary.outputDescriptionMarkdown,
        csv: dictionary.outputDescriptionCsv,
        sql: dictionary.outputDescriptionSql,
        html: dictionary.outputDescriptionHtml,
        json: dictionary.json.outputDescriptionJson,
        png: dictionary.png.outputDescriptionPng
    }[outputType];
        
    const outputPlaceholder = {
        markdown: dictionary.outputPlaceholderMarkdown,
        csv: dictionary.outputPlaceholderCsv,
        sql: dictionary.outputPlaceholderSql,
        html: dictionary.outputPlaceholderHtml,
        json: dictionary.json.outputPlaceholderJson,
        png: dictionary.png.outputPlaceholderPng
    }[outputType];

    const PngPreviewTable = () => {
        const tableData = parseInput(inputData);
        if (!tableData || tableData.length === 0) return null;
        const headerRow = firstHeader ? tableData[0] : [];
        const bodyRows = firstHeader ? tableData.slice(1) : tableData;

        const cellStyle = {
            padding: `${pngCellPadding[0]}px`,
            border: pngShowBorders ? `1px solid ${pngTheme === 'light' ? '#dddddd' : '#555555'}` : 'none',
        };

        const headerCellStyle = {
            ...cellStyle,
            fontWeight: pngBoldHeader ? 'bold' : 'normal',
        };

        return (
             <div 
                ref={imagePreviewRef} 
                className="absolute -left-[9999px] -top-[9999px] p-4 bg-background"
                style={{ 
                    padding: `${pngPadding[0]}px`,
                    backgroundColor: pngBgColor,
                    fontFamily: pngFontFamily,
                    color: pngTheme === 'light' ? '#000000' : '#ffffff',
                }}
            >
                <table 
                    className="border-collapse w-full" 
                    style={{ 
                        fontSize: `${pngFontSize[0]}px`,
                    }}
                >
                    {firstHeader && (
                        <thead>
                            <tr>
                                {headerRow.map((cell, i) => (
                                    <th key={i} style={headerCellStyle} className="p-2 text-left">{cell}</th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {bodyRows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} style={cellStyle} className="p-2">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{dictionary.inputCardTitle}</span>
                        <Button variant="outline" size="sm" onClick={handleUploadClick} className="rounded-md">
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
                                <a href="https://bit.ly/44EVg9i" target="_blank" rel="noopener noreferrer">
                                    <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a beer&emoji=🍺&slug=xtfyjwvsyv&button_colour=3b82f6&font_colour=ffffff&font_family=Bree&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a beer" className="h-9" />
                                </a>
                                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!outputData || isConverting} className="rounded-md">
                                    <Download className="mr-2 h-4 w-4" />
                                    {dictionary.downloadButton}
                                </Button>
                                <Button variant="default" size="sm" onClick={handleCopy} disabled={!outputData || isConverting} className="rounded-md">
                                    <Copy className="mr-2 h-4 w-4" />
                                    {dictionary.copyButton}
                                </Button>
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

                        <Tabs value={outputType} onValueChange={(v) => setOutputType(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-6">
                                <TabsTrigger value="markdown">{dictionary.outputTypeMarkdown}</TabsTrigger>
                                <TabsTrigger value="csv">{dictionary.outputTypeCsv}</TabsTrigger>
                                <TabsTrigger value="sql">{dictionary.outputTypeSql}</TabsTrigger>
                                <TabsTrigger value="html">{dictionary.outputTypeHtml}</TabsTrigger>
                                <TabsTrigger value="json">{dictionary.json.outputTypeJson}</TabsTrigger>
                                <TabsTrigger value="png">{dictionary.png.outputTypePng}</TabsTrigger>
                            </TabsList>
                            {outputType === 'markdown' && (
                            <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                                <p className="text-sm font-medium">{dictionary.markdownOptionsTitle}</p>
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="flex items-center space-x-2">
                                            <Checkbox id="first-header-md" checked={firstHeader} onCheckedChange={(c) => setFirstHeader(!!c)} />
                                            <Label htmlFor="first-header-md">{dictionary.firstHeader}</Label>
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
                                            <Checkbox id="first-header-sql" checked={firstHeader} onCheckedChange={(c) => setFirstHeader(!!c)} />
                                            <Label htmlFor="first-header-sql">{dictionary.firstHeader}</Label>
                                        </div>
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
                                                            <Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
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

                            {outputType === 'html' && (
                                <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                                     <p className="text-sm font-medium">{dictionary.html.htmlOptionsTitle}</p>
                                     <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="first-header-html" checked={firstHeader} onCheckedChange={(c) => setFirstHeader(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="first-header-html">{dictionary.html.columnHeader}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.columnHeaderTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="use-div-table" checked={useDivTable} onCheckedChange={(c) => setUseDivTable(!!c)} />
                                             <div className="flex items-center gap-1">
                                                <Label htmlFor="use-div-table">{dictionary.html.divTable}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.divTableTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="minify-code" checked={minifyCode} onCheckedChange={(c) => setMinifyCode(!!c)} />
                                             <div className="flex items-center gap-1">
                                                <Label htmlFor="minify-code">{dictionary.html.minifyCode}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.minifyCodeTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="use-table-head" checked={useTableHeadStructure} onCheckedChange={(c) => setUseTableHeadStructure(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="use-table-head">{dictionary.html.tableHeadStructure}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.tableHeadStructureTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Checkbox id="use-table-caption" checked={useTableCaption} onCheckedChange={(c) => setUseTableCaption(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="use-table-caption">{dictionary.html.tableCaption}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.tableCaptionTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                     </div>
                                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="table-caption-text">{dictionary.html.tableCaption}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.tableCaptionTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                            <Input id="table-caption-text" value={tableCaptionText} onChange={(e) => setTableCaptionText(e.target.value)} disabled={!useTableCaption}/>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="table-class">{dictionary.html.tableClass}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.tableClassTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                            <Input id="table-class" value={tableClass} onChange={(e) => setTableClass(e.target.value)} />
                                        </div>
                                        <div className="grid gap-1.5">
                                             <div className="flex items-center gap-1">
                                                <Label htmlFor="table-id">{dictionary.html.tableId}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.html.tableIdTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                            <Input id="table-id" value={tableId} onChange={(e) => setTableId(e.target.value)} />
                                        </div>
                                     </div>
                                </div>
                            )}

                             {outputType === 'json' && (
                                <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                                     <p className="text-sm font-medium">{dictionary.json.jsonOptionsTitle}</p>
                                     <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="first-header-json" checked={firstHeader} onCheckedChange={(c) => setFirstHeader(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="first-header-json">{dictionary.firstHeader}</Label>
                                                 <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.json.firstHeaderTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="minify-json" checked={minifyJson} onCheckedChange={(c) => setMinifyJson(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="minify-json">{dictionary.json.minifyJson}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.json.minifyJsonTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                     </div>
                                     <div className="grid gap-1.5">
                                        <Label htmlFor="json-format">{dictionary.json.jsonFormat}</Label>
                                        <Select value={jsonFormat} onValueChange={setJsonFormat}>
                                            <SelectTrigger id="json-format" className="bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="array_objects">{dictionary.json.formatArrayObjects}</SelectItem>
                                                <SelectItem value="array_arrays">{dictionary.json.formatArrayArrays}</SelectItem>
                                                <SelectItem value="object_objects">{dictionary.json.formatObjectObjects}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {outputType === 'png' && (
                                <div className="mt-4 p-4 border rounded-lg bg-card space-y-4">
                                    <p className="text-sm font-medium">{dictionary.png.pngOptionsTitle}</p>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="png-theme">{dictionary.png.theme}</Label>
                                            <Select value={pngTheme} onValueChange={setPngTheme}>
                                                <SelectTrigger id="png-theme" className="bg-background"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="light">{dictionary.png.themeLight}</SelectItem>
                                                    <SelectItem value="dark">{dictionary.png.themeDark}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                             <div className="flex items-center gap-1">
                                                <Label htmlFor="png-bg-color">{dictionary.png.backgroundColor}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.png.backgroundColorTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                            <Input id="png-bg-color" type="color" value={pngBgColor} onChange={(e) => setPngBgColor(e.target.value)} />
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Checkbox id="show-borders-png" checked={pngShowBorders} onCheckedChange={(c) => setPngShowBorders(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="show-borders-png">{dictionary.png.showBorders}</Label>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="bold-header-png" checked={pngBoldHeader} onCheckedChange={(c) => setPngBoldHeader(!!c)} />
                                            <div className="flex items-center gap-1">
                                                <Label htmlFor="bold-header-png">{dictionary.png.boldHeader}</Label>
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{dictionary.png.boldHeaderTooltip}</p></TooltipContent></Tooltip></TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="png-font-family">{dictionary.png.fontFamily}</Label>
                                        <Select value={pngFontFamily} onValueChange={setPngFontFamily}>
                                            <SelectTrigger id="png-font-family" className="bg-background" style={{fontFamily: pngFontFamily}}><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sans-serif" style={{fontFamily: 'sans-serif'}}>Sans-serif</SelectItem>
                                                <SelectItem value="serif" style={{fontFamily: 'serif'}}>Serif</SelectItem>
                                                <SelectItem value="monospace" style={{fontFamily: 'monospace'}}>Monospace</SelectItem>
                                                <SelectItem value="Arial, sans-serif" style={{fontFamily: 'Arial, sans-serif'}}>Arial</SelectItem>
                                                <SelectItem value="'Times New Roman', serif" style={{fontFamily: "'Times New Roman', serif"}}>Times New Roman</SelectItem>
                                                <SelectItem value="'Courier New', monospace" style={{fontFamily: "'Courier New', monospace"}}>Courier New</SelectItem>
                                                <SelectItem value="Verdana, sans-serif" style={{fontFamily: 'Verdana, sans-serif'}}>Verdana</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="grid gap-1.5">
                                        <Label htmlFor="png-padding">{dictionary.png.padding} ({pngPadding[0]}px)</Label>
                                        <Slider id="png-padding" value={pngPadding} onValueChange={setPngPadding} max={50} step={1} />
                                    </div>
                                     <div className="grid gap-1.5">
                                        <Label htmlFor="png-cell-padding">{dictionary.png.cellPadding} ({pngCellPadding[0]}px)</Label>
                                        <Slider id="png-cell-padding" value={pngCellPadding} onValueChange={setPngCellPadding} max={30} step={1} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="png-font-size">{dictionary.png.fontSize} ({pngFontSize[0]}px)</Label>
                                        <Slider id="png-font-size" value={pngFontSize} onValueChange={setPngFontSize} min={8} max={24} step={1} />
                                    </div>
                                    <PngPreviewTable />
                                </div>
                            )}

                        </Tabs>

                        <div className="mt-4">
                            <Label htmlFor="output-data" className="sr-only">{dictionary.outputCardTitle}</Label>
                            {outputType === 'png' ? (
                                <div className="min-h-[300px] bg-muted/50 rounded-md flex items-center justify-center p-4">
                                    {isConverting ? (
                                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                    ) : outputData ? (
                                        <img src={outputData} alt={dictionary.png.previewAlt} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <p className="text-muted-foreground">{outputPlaceholder}</p>
                                    )}
                                </div>
                            ) : (
                                <Textarea
                                    id="output-data"
                                    value={outputData}
                                    readOnly
                                    placeholder={outputPlaceholder}
                                    className="min-h-[300px] bg-muted/50 font-mono text-sm transition-opacity duration-300"
                                    aria-label="Área de texto para salida"
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
