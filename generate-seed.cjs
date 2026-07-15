const xlsx = require('xlsx');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const workbook = xlsx.readFile('PRODUCT LIST.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

const categories = new Set();
const products = [];

// Extract categories and products
data.forEach(row => {
  for (const [categoryName, productName] of Object.entries(row)) {
    if (productName && productName.trim() !== '') {
      const cat = categoryName.trim();
      const prod = productName.trim();
      categories.add(cat);
      products.push({ category: cat, name: prod });
    }
  }
});

let sql = `-- Seed Data for CafePilot\n\n`;

const categoryMap = {};

// 1. Insert Categories
sql += `-- Categories\n`;
Array.from(categories).forEach(cat => {
  const catId = uuidv4();
  categoryMap[cat] = catId;
  sql += `INSERT INTO categories (id, name) VALUES ('${catId}', '${cat.replace(/'/g, "''")}');\n`;
});

sql += `\n-- Products\n`;
let codeCounter = 1;
products.forEach(p => {
  const prodId = uuidv4();
  const catId = categoryMap[p.category];
  const code = `PRD-${String(codeCounter).padStart(3, '0')}`;
  sql += `INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('${prodId}', '${code}', '${p.name.replace(/'/g, "''")}', '${catId}', 'Unit', true);\n`;
  codeCounter++;
});

fs.writeFileSync('seed_products.sql', sql);
console.log('Generated seed_products.sql');
