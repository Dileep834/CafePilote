const xlsx = require('xlsx');

const workbook = xlsx.readFile('PRODUCT LIST.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

console.log(JSON.stringify(data.slice(0, 5), null, 2));
