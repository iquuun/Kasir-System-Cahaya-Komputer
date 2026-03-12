const fs = require('fs');
const path = require('path');

const targetPages = [
    'PenjualanPage.tsx',
    'Dashboard.tsx'
];

for (const page of targetPages) {
    const filePath = path.join(__dirname, 'src/app/pages', page);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Headers & Main Structure padding
    content = content.replace(/p-5/g, 'p-4');
    
    if (page === 'Dashboard.tsx') {
        content = content.replace(/gap-4/g, 'gap-3');
        content = content.replace(/text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1/g, 'text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5');
        content = content.replace(/text-2xl font-bold/g, 'text-xl font-bold tracking-tight');
        content = content.replace(/text-\[11px\] text-gray-400 font-medium/g, 'text-[10px] text-gray-400 font-medium');

        // Recent transaction list padding
        content = content.replace(/px-4 py-3/g, 'px-3 py-2.5');
        content = content.replace(/w-10 h-10/g, 'w-8 h-8');
        content = content.replace(/text-sm font-semibold/g, 'text-xs font-bold');
        content = content.replace(/text-xs text-gray-500/g, 'text-[10px] text-gray-500');
        content = content.replace(/px-4 py-3 flex items-center justify-between group cursor-pointer hover:bg-blue-50/g, 'px-3 py-2 flex items-center justify-between group cursor-pointer hover:bg-blue-50/50');
    }

    if (page === 'PenjualanPage.tsx') {
        // Tab switch layout
        content = content.replace(/px-6 py-2 rounded-lg/g, 'px-4 py-1.5 rounded-md text-xs');
        
        // POS layout paddings
        // Be careful not to replace `lg:col-span-2 flex flex-col gap-4` blindly, do specific replaces
        content = content.replace(/gap-4 h-\[calc\(100vh-140px\)\]/g, 'gap-2.5 h-[calc(100vh-110px)]');
        content = content.replace(/p-4 shrink-0/g, 'p-3 shrink-0');
        content = content.replace(/p-4 flex flex-col/g, 'p-3 flex flex-col');
        content = content.replace(/p-4 mt-auto/g, 'p-3 mt-auto');
        content = content.replace(/mb-4 pb-3/g, 'mb-2 pb-2');
        content = content.replace(/mb-4 space-y-2/g, 'mb-2 space-y-1.5');
        content = content.replace(/grid-cols-1 md:grid-cols-3 gap-3/g, 'grid-cols-1 md:grid-cols-3 gap-2');
        content = content.replace(/mb-3/g, 'mb-2');
        
        // History table
        content = content.replace(/px-6 py-4/g, 'px-3 py-2');
        content = content.replace(/text-sm font-medium text-gray-700/g, 'text-[10px] uppercase tracking-wider font-bold text-gray-500');
        
        // Numpad shrink
        content = content.replace(/h-10 rounded-md/g, 'h-9 rounded-md');
        content = content.replace(/h-12 mt-1.5/g, 'h-10 mt-1');
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

console.log("Compacted Penjualan and Dashboard successfully!");
