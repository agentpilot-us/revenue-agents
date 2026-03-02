/**
 * Reads scripts/b2b-sales-activities-data.json and writes
 * B2B Sales Activities and Plays.xlsx to the project root.
 * Run: node scripts/b2b-sales-activities-to-excel.cjs
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dataPath = path.join(__dirname, 'b2b-sales-activities-data.json');
const outPath = path.join(__dirname, '..', 'B2B Sales Activities and Plays.xlsx');

const raw = fs.readFileSync(dataPath, 'utf8');
const { file_name, sheets } = JSON.parse(raw);

const workbook = XLSX.utils.book_new();

for (const sheet of sheets) {
  const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
}

XLSX.writeFile(workbook, outPath);
console.log('Written:', outPath);
