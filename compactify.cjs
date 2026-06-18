const fs = require('fs');
const path = require('path');

const targetPages = [
    'PembelianTab.tsx',
    'DistributorPage.tsx',
    'StokOpnamePage.tsx',
    'CashFlowPage.tsx',
    'LaporanLabaPage.tsx',
    'NilaiAsetPage.tsx',
    'PengaturanPage.tsx'
];

for (const page of targetPages) {
    const filePath = path.join(__dirname, 'src/app/pages', page);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Headers
    content = content.replace(/text-xl font-semibold text-gray-800/g, 'text-base font-bold text-gray-800 tracking-tight');
    content = content.replace(/text-gray-600 mt-1/g, 'text-xs text-gray-500 mt-0.5');

    // Button Tambah
    content = content.replace(/gap-2 bg-\[\#3B82F6\] text-white px-3 py-2 rounded-lg/g, 'gap-1.5 bg-[#3B82F6] text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm');
    content = content.replace(/<Plus size=\{16\} \/>/g, '<Plus size={14} />');

    // 2. Stats/Cards Containers
    content = content.replace(/rounded-lg shadow-sm border border-gray-100 p-4/g, 'rounded-xl shadow-sm border border-gray-100 p-3');
    content = content.replace(/grid-cols-1 md:grid-cols-3 gap-4/g, 'grid-cols-1 md:grid-cols-3 gap-3');
    content = content.replace(/grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4/g, 'grid-cols-1 md:grid-cols-4 gap-3');

    // Stat texts
    content = content.replace(/<p className="text-xs text-gray-600 mb-1">/g, '<p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">');
    content = content.replace(/<p className="text-xl font-semibold/g, '<p className="text-xl font-bold');

    // 3. Filters Wrapper
    content = content.replace(/flex flex-col md:flex-row gap-3/g, 'flex flex-col md:flex-row gap-2');
    content = content.replace(/w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2/g, 'w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs bg-gray-50');
    content = content.replace(/px-3 py-2 border border-gray-300 rounded-lg focus:ring-2/g, 'px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-1 text-xs font-medium bg-gray-50');

    // 4. Tables wrappers
    content = content.replace(/bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden/g, 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden');
    content = content.replace(/bg-gray-50 border-b border-gray-200/g, 'bg-gray-50 border-b border-gray-100');

    // Table th
    content = content.replace(/th className="(.*?) px-4 py-2 text-xs font-medium text-gray-700"/g, 'th className="$1 px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-gray-500"');

    // Table td
    content = content.replace(/className="hover:bg-gray-50 transition-colors"/g, 'className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0"');
    content = content.replace(/td className="px-4 py-3"/g, 'td className="px-3 py-2 text-xs"');
    content = content.replace(/td className="px-4 py-3 text-right"/g, 'td className="px-3 py-2 text-right text-xs"');
    content = content.replace(/td className="px-4 py-3 text-center"/g, 'td className="px-3 py-2 text-center text-xs"');
    content = content.replace(/td className="px-4 py-3 text-right text-gray-700"/g, 'td className="px-3 py-2 text-right text-xs text-gray-600 font-medium"');
    content = content.replace(/<p className="font-medium text-gray-800">/g, '<p className="font-bold text-xs text-gray-800">');

    // General button actions in table
    content = content.replace(/className="p-2 text-\[\#3B82F6\] hover:bg-\[\#3B82F6\]\/10 rounded-lg transition-colors"/g, 'className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"');
    content = content.replace(/className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"/g, 'className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"');
    
    // Status badges
    content = content.replace(/px-2.5 py-0.5 rounded-full text-xs/g, 'px-2 py-0.5 rounded text-[10px] font-bold');

    fs.writeFileSync(filePath, content, 'utf8');
}

console.log("Compacted other pages successfully!");
