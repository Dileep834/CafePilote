const XLSX = require('xlsx');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const COMPANY_ID = 'c1000000-0000-0000-0000-000000000001';
const workbook = XLSX.readFile('PRODUCT LIST.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length === 0) {
    console.error('Excel file is empty');
    process.exit(1);
}

const headers = data[0];
const categories = {}; // Map header name to UUID
let sqlOutput = '-- Seed Data for CafePilot SaaS\n\n-- Categories\n';

// 1. Create Categories
headers.forEach(header => {
    if (header && typeof header === 'string') {
        const catName = header.trim();
        const id = uuidv4();
        categories[catName] = id;
        sqlOutput += `INSERT INTO categories (id, name, company_id) VALUES ('${id}', '${catName.replace(/'/g, "''")}', '${COMPANY_ID}') ON CONFLICT DO NOTHING;\n`;
    }
});

sqlOutput += '\n-- Products\n';

let productCounter = 1;
// 2. Iterate through rows to get products
for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    headers.forEach((header, index) => {
        if (!header) return;
        const catName = header.trim();
        const productName = row[index];
        
        if (productName && typeof productName === 'string' && productName.trim() !== '') {
            const prdId = uuidv4();
            const prdCode = 'PRD-' + productCounter.toString().padStart(4, '0');
            const cleanName = productName.trim().replace(/'/g, "''");
            const catId = categories[catName];
            
            sqlOutput += `INSERT INTO products (id, code, name, category_id, unit, is_active, company_id) VALUES ('${prdId}', '${prdCode}', '${cleanName}', '${catId}', 'Unit', true, '${COMPANY_ID}') ON CONFLICT DO NOTHING;\n`;
            productCounter++;
        }
    });
}

fs.writeFileSync('scripts/seed_products_saas.sql', sqlOutput);
console.log('Successfully generated seed_products_saas.sql with ' + (productCounter - 1) + ' products across ' + Object.keys(categories).length + ' categories.');

