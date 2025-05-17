const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const Papa = require('papaparse');
const fs = require('fs').promises;
const config = require('./config');

app.use(express.static(path.join(__dirname, 'public')));

let cachedData = null; // CSVデータをキャッシュする変数

async function loadCSV(filePath) {
  const csvFile = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse(csvFile, { header: true, dynamicTyping: true });
  return result.data;
}

async function findFirstUnlabeledIndex(data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].label === null) {
      return i;
    }
  }
  return -1;
}

// サーバー起動時にCSVファイルを読み込む
async function initialize() {
  try {
    cachedData = await loadCSV(config.csvFilePath);
    console.log('CSV file loaded successfully.');
  } catch (error) {
    console.error('Failed to load CSV file:', error.message);
  }
}

app.get('/api/load-csv', async (req, res) => {
  try {
    const requestedIndex = parseInt(req.query.index);
    let firstUnlabeledIndex = await findFirstUnlabeledIndex(cachedData);
    console.log("Update firstUnlabeledIndex: ", firstUnlabeledIndex);

    if (isNaN(requestedIndex)) {
    } else if (requestedIndex >= 0 && requestedIndex < cachedData.length) {
        firstUnlabeledIndex = requestedIndex;
    } else {
        return res.status(400).json({ error: 'Invalid index provided.' });
    }
      
    const startIndex = Math.max(0, firstUnlabeledIndex - 5);
    const endIndex = Math.min(cachedData.length - 1, firstUnlabeledIndex + 5);
    const slicedData = cachedData.slice(startIndex, endIndex + 1).map((item, index) => ({
      index: startIndex + index,
      ...item,
    }));
    res.json(slicedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/update-label', async (req, res) => {
  try {
    const index = parseInt(req.query.index);
    const label = req.query.label;
    cachedData[index].label = label;
    // CSVファイルに書き込む
    // const csv = Papa.unparse(cachedData, { header: true });
    // await fs.writeFile(config.csvFilePath, csv);
    res.json({ message: 'Label updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/save-csv', async (req, res) => {
  try {
    const csv = Papa.unparse(cachedData, { header: true });
    await fs.writeFile(config.csvFilePath, csv);
    console.log('CSV file saved successfully.');
    res.json({ message: 'CSV file saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  initialize(); // サーバー起動後にCSVファイルを読み込む
});