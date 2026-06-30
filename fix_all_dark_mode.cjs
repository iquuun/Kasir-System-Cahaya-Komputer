const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      // Exclude ui components since they are usually correct and semantic
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git' && file !== 'ui') {
        walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('./src/app');

const replaceMap = {
  'bg-white': 'bg-card',
  'bg-gray-50': 'bg-muted',
  'bg-gray-100': 'bg-accent',
  'bg-gray-200': 'bg-accent',
  
  'hover:bg-gray-50': 'hover:bg-muted',
  'hover:bg-gray-100': 'hover:bg-accent',
  'hover:bg-gray-200': 'hover:bg-accent',
  
  'border-gray-50': 'border-border',
  'border-gray-100': 'border-border',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  
  'text-gray-900': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-700': 'text-foreground',
  'text-slate-900': 'text-foreground',
  'text-slate-800': 'text-foreground',
  
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground',
  
  // also fix text-black that shouldn't be hardcoded
  'text-black': 'text-foreground',
};

let filesUpdated = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const [key, value] of Object.entries(replaceMap)) {
    const safeKey = key.replace(/[\[\]\/]/g, '\\$&');
    const regex = new RegExp(`(?<=[\\s"'\\\`])${safeKey}(?=[\\s"'\\\`])`, 'g');
    content = content.replace(regex, value);
  }
  
  // Custom replaces
  content = content.replace(/bg-gray-50\/50/g, 'bg-muted/50');
  content = content.replace(/bg-gray-50\/80/g, 'bg-muted/80');
  content = content.replace(/bg-white\/50/g, 'bg-card/50');
  content = content.replace(/bg-white\/80/g, 'bg-card/80');
  content = content.replace(/bg-white\/90/g, 'bg-card/90');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    filesUpdated++;
  }
});

console.log(`Total files updated: ${filesUpdated}`);
