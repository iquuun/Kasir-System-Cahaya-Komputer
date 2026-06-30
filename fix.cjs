const fs = require('fs');
let content = fs.readFileSync('src/app/pages/KalkulatorRakitanPage.tsx', 'utf8');

// Add text-foreground to inputs and selects that have className
content = content.replace(/(<(?:input|select|textarea)[^>]*className=["'])([^"']*?)(["'][^>]*>)/g, (match, p1, p2, p3) => {
    if (!p2.includes('text-foreground') && !p2.includes('text-white') && !p2.includes('text-black')) {
        return p1 + p2 + ' text-foreground' + p3;
    }
    return match;
});

// Also fix row colors
content = content.replace(/bg-gray-50\/60/g, 'bg-muted/40');
content = content.replace(/text-gray-300/g, 'text-muted-foreground');

// Fix bg-emerald-50 and bg-orange-50 to support dark mode
content = content.replace(/bg-emerald-50 /g, 'bg-emerald-50 dark:bg-emerald-500/10 ');
content = content.replace(/bg-orange-50 /g, 'bg-orange-50 dark:bg-orange-500/10 ');

fs.writeFileSync('src/app/pages/KalkulatorRakitanPage.tsx', content);
console.log('Fixed KalkulatorRakitanPage.tsx');
