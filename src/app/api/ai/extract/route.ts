import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        console.log('API Request started');
        const formData = await req.formData();
        const type = formData.get('type') as string;

        let extractedText = '';

        if (type === 'url') {
            const url = formData.get('url') as string;
            if (!url) throw new Error('URL is required');

            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
            }

            const html = await res.text();
            const $ = load(html);

            // Remove scripts, styles, and boilerplate
            $('script').remove();
            $('style').remove();
            $('nav').remove();
            $('footer').remove();

            extractedText = $('body').text().replace(/\s+/g, ' ').trim();

            // Basic heuristic to limit size (e.g. 5000 chars)
            if (extractedText.length > 10000) extractedText = extractedText.substring(0, 10000) + '... (truncated)';

        } else if (type === 'file') {
            const file = formData.get('file') as File;
            if (!file) throw new Error('File is required');

            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.pdf')) {
                try {
                    // @ts-ignore
                    let pdfParse = require('pdf-parse');

                    console.log('PDF Parse Load Type:', typeof pdfParse);
                    if (typeof pdfParse === 'object') {
                        console.log('PDF Parse Keys:', Object.keys(pdfParse));
                        // Start: Fix for potential ESM default export usage
                        if (typeof pdfParse.default === 'function') {
                            pdfParse = pdfParse.default;
                            console.log('Using pdfParse.default function');
                        }
                    }

                    if (typeof pdfParse !== 'function') {
                        throw new Error(`pdf-parse loaded as ${typeof pdfParse}, expected function. Keys: ${JSON.stringify(Object.keys(pdfParse || {}))}`);
                    }

                    const data = await pdfParse(buffer);
                    extractedText = data.text;
                } catch (err: any) {
                    console.error('PDF parse error:', err);
                    throw new Error(`Error al procesar el archivo PDF: ${err.message}`);
                }

            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                extractedText = XLSX.utils.sheet_to_txt(sheet);
            } else {
                // Assume text
                extractedText = buffer.toString('utf-8');
            }
        } else {
            throw new Error('Invalid type');
        }

        // Cleanup whitespace
        extractedText = extractedText.replace(/\n\s*\n/g, '\n').trim();

        return NextResponse.json({ success: true, text: extractedText });

    } catch (error: any) {
        console.error('Extraction error:', error);
        // Ensure we always return JSON, never let Next.js default HTML error page leak through
        return NextResponse.json({ success: false, error: error.message || 'Unknown server error' }, { status: 500 });
    }
}
