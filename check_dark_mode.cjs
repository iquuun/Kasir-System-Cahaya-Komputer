const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git' && file !== 'components') {
        walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('./src');
const issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('className=')) {
      if (line.includes('bg-white') && !line.includes('dark:bg-')) {
        issues.push({file, line: idx+1, issue: 'bg-white without dark:bg-'});
      }
      if (line.match(/text-gray-[89]00/) && !line.includes('dark:text-')) {
        issues.push({file, line: idx+1, issue: 'text-gray-800/900 without dark:text-'});
      }
      if (line.match(/text-slate-[89]00/) && !line.includes('dark:text-')) {
        issues.push({file, line: idx+1, issue: 'text-slate-800/900 without dark:text-'});
      }
      if (line.includes('bg-gray-50') && !line.includes('dark:bg-')) {
        issues.push({file, line: idx+1, issue: 'bg-gray-50 without dark:bg-'});
      }
      if (line.includes('border-gray-200') && !line.includes('dark:border-')) {
         issues.push({file, line: idx+1, issue: 'border-gray-200 without dark:border-'});
      }
      if (line.includes('bg-gray-100') && !line.includes('dark:bg-')) {
         issues.push({file, line: idx+1, issue: 'bg-gray-100 without dark:bg-'});
      }
      if (line.includes('bg-gray-200') && !line.includes('dark:bg-')) {
         issues.push({file, line: idx+1, issue: 'bg-gray-200 without dark:bg-'});
      }
    }
  });
}

const grouped = issues.reduce((acc, issue) => {
  acc[issue.file] = acc[issue.file] || [];
  acc[issue.file].push(issue);
  return acc;
}, {});

console.log(JSON.stringify(grouped, null, 2));
