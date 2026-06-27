const fs = require('fs');
const path = require('path');

const exportsDir = path.join(__dirname, 'stitch-exports');
const pagesDir = path.join(__dirname, 'src', 'pages');

if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}

const files = fs.readdirSync(exportsDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(exportsDir, file), 'utf8');
  
  // Extract body content
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : content;

  // Convert basic HTML to JSX (class to className, for to htmlFor, self-closing tags)
  bodyContent = bodyContent
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    // Fix self closing tags like img, input, br, hr, path
    .replace(/<(img|input|br|hr|path|meta|link)([^>]*[^/])>/g, '<$1$2 />');
    
  // Handle some specific SVG attributes that need camelCase in React (stroke-width -> strokeWidth, stroke-linecap -> strokeLinecap, stroke-linejoin -> strokeLinejoin, fill-rule -> fillRule, clip-rule -> clipRule)
  bodyContent = bodyContent
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/stroke-miterlimit=/g, 'strokeMiterlimit=')
    .replace(/xmlns:xlink=/g, 'xmlnsXlink=')
    .replace(/viewbox=/g, 'viewBox=')
    .replace(/style="([^"]*)"/g, (match, styleAttr) => {
        // Very basic inline style conversion to JS object
        const styles = styleAttr.split(';').filter(s => s.trim() !== '').map(s => {
            const [key, value] = s.split(':').map(str => str.trim());
            const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            return `"${camelKey}": "${value}"`;
        }).join(', ');
        return `style={{${styles}}}`;
    });

  const componentName = file.replace('.html', '');
  
  const jsxTemplate = `import React from 'react';
import { Link } from 'react-router-dom';

const ${componentName} = () => {
  return (
    <div className="min-h-screen bg-background-subtle">
      {/* 
        Note: Links and interactive elements need to be wired up. 
        Replace <a> tags with <Link to="..."> where appropriate.
      */}
      ${bodyContent}
    </div>
  );
};

export default ${componentName};
`;

  fs.writeFileSync(path.join(pagesDir, `${componentName}.jsx`), jsxTemplate);
  console.log(`Converted ${file} to ${componentName}.jsx`);
});
