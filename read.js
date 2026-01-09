// this code is used to load the excel data (Node.js only)
const xlsx = require("xlsx");
const fs = require("fs");

// load the workbook
const workbook = xlsx.readFile("Data Analytics Intern Assignment - Data Set.xlsx");

// sheets to convert
const sheets = ["Orders_Raw", "Sessions_Raw", "Calls_Raw"];

// to create data folder if not exists
if (!fs.existsSync("data")) {
  fs.mkdirSync("data");
}

// to convert sheets to JSON
sheets.forEach(sheet => {
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
  fs.writeFileSync(`data/${sheet}.json`, JSON.stringify(jsonData, null, 2));
});

console.log(" Excel converted to JSON successfully");
