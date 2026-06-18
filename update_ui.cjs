const fs = require('fs');
const path = require('path');

const dirs = [
    './src/app/pages',
    './src/app/components' // Wait, I might want to exclude Sidebar and Topbar because they size the layout itself
];

const excludeFiles = ['PenjualanPage.tsx', 'Sidebar.tsx', 'Topbar.tsx'];

const classMap = {
    // Fonts
    'text-4xl': 'text-3xl',
    'text-3xl': 'text-2xl',
    'text-2xl': 'text-xl',
    'text-xl': 'text-lg',
    'text-lg': 'text-base',
    'text-base': 'text-sm',
    'text-sm': 'text-xs',
    'text-xs': 'text-[11px]',
    // Padding
    'p-8': 'p-5',
    'p-6': 'p-4',
    'p-5': 'p-4',
    'p-4': 'p-3',
    // px/py
    'px-8': 'px-6',
    'px-6': 'px-4',
    'px-5': 'px-4',
    'px-4': 'px-3',
    'py-8': 'py-5',
    'py-6': 'py-4',
    'py-5': 'py-4',
    'py-4': 'py-3',
    'py-3': 'py-2',
    // Gap
    'gap-8': 'gap-5',
    'gap-6': 'gap-4',
    'gap-5': 'gap-4',
    'gap-4': 'gap-3',
    // Margins
    'mb-8': 'mb-5',
    'mb-6': 'mb-4',
    'mb-5': 'mb-4',
    'mb-4': 'mb-3',
    'mt-8': 'mt-5',
    'mt-6': 'mt-4',
    'mt-5': 'mt-4',
    'mt-4': 'mt-3',
    // Heights
    'h-14': 'h-12',
    'h-12': 'h-10',
    'h-16': 'h-12',
    'w-12': 'w-10'
};

const exactStringReplacements = [
    { find: 'size={32}', replace: 'size={24}' },
    { find: 'size={24}', replace: 'size={20}' },
    { find: 'size={20}', replace: 'size={18}' },
    { find: 'size={18}', replace: 'size={16}' }
];

function processFile(filePath) {
    if (excludeFiles.some(ex => filePath.endsWith(ex))) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Use a single run to replace words
    // We iterate from largest to smallest to ensure no double replacement in the same run?
    // Actually, doing a straight `.replace` per key might double replace if we do text-xl -> text-lg, then text-lg -> text-base later.
    // To fix this, we'll do an inline replace function.

    const keys = Object.keys(classMap).map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(?<=['"\\s\`])(${keys.join('|')})(?=['"\\s\`])`, 'g');
    
    content = content.replace(regex, (match) => {
        return classMap[match];
    });

    for (let r of exactStringReplacements) {
        content = content.split(r.find).join(r.replace);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

dirs.forEach(dir => {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.tsx')) {
            processFile(path.join(dir, file));
        }
    });
});
