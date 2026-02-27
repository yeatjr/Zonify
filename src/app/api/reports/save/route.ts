import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { pdfBase64, filename } = await req.json();

        if (!pdfBase64 || !filename) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const reportsDir = path.join(process.cwd(), 'public', 'reports');

        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const safeFilename = filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '') + `_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, safeFilename);

        const buffer = Buffer.from(pdfBase64, 'base64');
        fs.writeFileSync(filePath, buffer);

        const reportUrl = `/reports/${safeFilename}`;

        return NextResponse.json({ success: true, url: reportUrl });
    } catch (error: any) {
        console.error('Report Save Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
