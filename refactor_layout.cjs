const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  // Skip FieldWorker.tsx since we already did it manually, and non-dashboard pages
  if (['FieldWorker.tsx', 'LandingPage.tsx', 'Login.tsx', 'NotFound.tsx'].includes(file)) {
    continue;
  }

  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove Sidebar import
  content = content.replace(/import Sidebar from '..\/components\/Sidebar';\r?\n?/g, '');
  content = content.replace(/import Sidebar from "..\/components\/Sidebar";\r?\n?/g, '');

  // Remove Sidebar render
  content = content.replace(/<Sidebar[^>]*>\r?\n?/g, '');

  // Replace wrapping min-h-screen flex div
  content = content.replace(/<div className="min-h-screen bg-background-subtle flex">/g, '<div className="flex flex-col h-full w-full">');

  // Replace main height
  content = content.replace(/<main className="flex-1 h-screen overflow-y-auto/g, '<main className="flex-1 h-full overflow-y-auto');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
