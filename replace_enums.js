const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'seed.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = {
    'Role.PROCESS_ANALYST': '"PROCESS_ANALYST"',
    'Role.PROCESS_MANAGER': '"PROCESS_MANAGER"',
    'Role.PROCESS_OWNER': '"PROCESS_OWNER"',
    'ProcessType.ОСНОВНИЙ': '"MAIN"',
    'ProcessType.УПРАВЛІНСЬКИЙ': '"MANAGERIAL"',
    'ProcessType.СЕРВІСНИЙ': '"SERVICE"',
    'ProcessStatus.APPROVED': '"APPROVED"',
    'ProcessStatus.DRAFT': '"DRAFT"',
    'ProcessStatus.IN_REVIEW_ANALYST': '"IN_REVIEW_ANALYST"',
    'WorkflowStage.ANALYST_REVIEW': '"ANALYST_REVIEW"'
};

for (const [k, v] of Object.entries(replacements)) {
    content = content.replaceAll(k, v);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done replacing enums.');
