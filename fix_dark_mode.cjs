const fs = require('fs');

const files = [
  'src/app/pages/ProdukTab.tsx',
  'src/app/pages/KategoriTab.tsx'
];

const replaceMap = {
  'bg-white': 'bg-card',
  'border-gray-100': 'border-border',
  'border-gray-200': 'border-border',
  'border-gray-50': 'border-border',
  'text-gray-800': 'text-foreground',
  'text-gray-700': 'text-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'bg-gray-50': 'bg-muted',
  'bg-gray-100': 'bg-accent',
  'bg-gray-200': 'bg-accent',
  'hover:bg-gray-200': 'hover:bg-accent',
  'hover:bg-gray-100': 'hover:bg-accent',
  'hover:bg-blue-50/50': 'hover:bg-accent',
  'bg-[#3B82F6]': 'bg-primary',
  'text-[#3B82F6]': 'text-primary',
  'hover:bg-[#2563EB]': 'hover:bg-primary/90',
  'ring-white/50': 'ring-border/50',
  'bg-slate-900/40': 'bg-background/80',
  'text-[#3b82f6]': 'text-primary',
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  for (const [key, value] of Object.entries(replaceMap)) {
    // Escape backslashes and brackets
    const safeKey = key.replace(/[\[\]\/]/g, '\\$&');
    const regex = new RegExp(`(?<=[\\s"'\\\`])${safeKey}(?=[\\s"'\\\`])`, 'g');
    content = content.replace(regex, value);
  }
  
  content = content.replace(/bg-gray-50\/50/g, 'bg-muted/50');
  content = content.replace(/bg-gray-50\/80/g, 'bg-muted/80');
  content = content.replace(/bg-blue-50\/50/g, 'bg-accent');
  content = content.replace(/bg-blue-50\/30/g, 'bg-primary/10');
  content = content.replace(/bg-blue-50/g, 'bg-primary/10');
  content = content.replace(/text-blue-600/g, 'text-primary');
  content = content.replace(/text-blue-700/g, 'text-primary');
  content = content.replace(/ring-\[\#3B82F6\]/g, 'ring-primary');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
});
