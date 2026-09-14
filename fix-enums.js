const fs = require('fs');
const path = require('path');

function fixEnums(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    const match = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]@prisma\/client['"]/);
    if (match) {
        let imports = match[1].split(',').map(s => s.trim());
        const enums = ['Role', 'ProcessStatus', 'WorkflowStage', 'ProcessType'];
        const prismaImports = imports.filter(i => !enums.includes(i) && !i.replace('type ', '').trim().match(/^(Role|ProcessStatus|WorkflowStage|ProcessType)$/));
        const enumImports = imports.filter(i => {
            const base = i.replace('type ', '').trim();
            return enums.includes(base);
        });
        
        if (enumImports.length > 0) {
            // Find relative path to src/lib/enums.ts
            let relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'src', 'lib', 'enums'));
            relativePath = relativePath.replace(/\\/g, '/');
            if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
            
            const cleanEnumImports = enumImports.map(i => i.replace('type ', '').trim());
            
            let newImportStatement = '';
            if (prismaImports.length > 0) {
                newImportStatement += `import { ${prismaImports.join(', ')} } from '@prisma/client';\n`;
            }
            newImportStatement += `import { ${cleanEnumImports.join(', ')} } from '${relativePath}';`;
            
            content = content.replace(match[0], newImportStatement);
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Fixed enum import in:', filePath);
        }
    }
}

function walk(dir) {
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            fixEnums(fullPath);
        }
    }
}
walk(path.join(__dirname, 'src'));
