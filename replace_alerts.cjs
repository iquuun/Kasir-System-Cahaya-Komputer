const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/app/pages/CashFlowPage.tsx',
    'src/app/pages/DistributorPage.tsx',
    'src/app/pages/KategoriTab.tsx',
    'src/app/pages/PembelianTab.tsx',
    'src/app/pages/PenjualanPage.tsx',
    'src/app/pages/PengaturanPage.tsx',
    'src/app/pages/StokOpnamePage.tsx'
];

const successMessages = [
    "'Transaksi Berhasil!'",
    "'Pengaturan berhasil disimpan!'",
    "'Stok opname berhasil disimpan!'"
];

for (let filePath of filesToUpdate) {
    let absolutePath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(absolutePath)) continue;

    let content = fs.readFileSync(absolutePath, 'utf8');
    let original = content;

    // Add import if missing and alert exists
    if (content.includes('alert(') && !content.includes("from 'sonner'")) {
        // Find last import
        const importMatch = content.match(/^import .*?;$/gm);
        if (importMatch) {
            const lastImport = importMatch[importMatch.length - 1];
            content = content.replace(lastImport, lastImport + "\nimport { toast } from 'sonner';");
        } else {
             content = "import { toast } from 'sonner';\n" + content;
        }
    }

    // Replace alerts
    content = content.replace(/alert\((.*?)\);?/g, (match, inner) => {
        if (successMessages.includes(inner.trim())) {
            return `toast.success(${inner});`;
        } else {
            return `toast.error(${inner});`;
        }
    });

    if (content !== original) {
        fs.writeFileSync(absolutePath, content, 'utf8');
        console.log(`Updated sonner alerts in ${filePath}`);
    }
}
