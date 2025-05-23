const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const Papa = require('papaparse');
const fs = require('fs').promises;
const config = require('./config');

app.use(express.static(path.join(__dirname, 'public')));

let allCsvData = {}; // すべてのCSVデータをキャッシュするオブジェクト
let currentCsvFilePath = null; // 現在選択されているCSVファイルパス

async function loadCSV(filePath) {
  const csvFile = await fs.readFile(filePath, 'utf-8');
  const result = Papa.parse(csvFile, { header: true, dynamicTyping: true });
  return result.data;
}

async function findFirstUnlabeledIndex(data) {
  if (!data) return -1; // データがない場合は-1を返す
  for (let i = 0; i < data.length; i++) {
    if (data[i].label === null || data[i].label === undefined || data[i].label === '') {
      return i;
    }
  }
  return -1;
}

// ラベル別の統計情報を計算する関数
function calculateStats(data) {
  if (!data) return {};
  const stats = {};
  data.forEach(row => {
    const label = row.label === null || row.label === undefined || row.label === '' ? 'unlabeled' : row.label;
    stats[label] = (stats[label] || 0) + 1;
  });
  return stats;
}

// サーバー起動時にすべてのCSVファイルを読み込み、キャッシュする
async function initialize() {
  try {
    for (const filePath of config.csvFilePaths) {
      allCsvData[filePath] = await loadCSV(filePath);
      console.log(`CSV file loaded successfully: ${filePath}`);
    }
    if (config.csvFilePaths.length > 0) {
      currentCsvFilePath = config.csvFilePaths[0]; // 最初のファイルをデフォルトとして選択
    }
    console.log('All CSV files loaded and cached.');
  } catch (error) {
    console.error('Failed to load CSV files:', error.message);
  }
}

// CSVファイルリストを取得するAPI
app.get('/api/csv-files', (req, res) => {
  res.json(config.csvFilePaths);
});

// CSVファイルを切り替えるAPI
app.post('/api/select-csv', express.json(), async (req, res) => {
  const { filePath } = req.body;
  if (!config.csvFilePaths.includes(filePath)) {
    return res.status(400).json({ error: 'Invalid file path.' });
  }
  currentCsvFilePath = filePath;
  // ファイルは既にキャッシュされているので、再読み込みは不要
  console.log(`Switched to CSV file: ${currentCsvFilePath}`);
  res.json({ message: 'CSV file switched successfully' });
});

// ラベル別統計情報を取得するAPI
app.get('/api/stats', (req, res) => {
  const stats = {};
  const totalStats = {};
  for (const filePath in allCsvData) {
    stats[filePath] = calculateStats(allCsvData[filePath]);
    for (const label in stats[filePath]) {
      totalStats[label] = (totalStats[label] || 0) + stats[filePath][label];
    }
  }
  res.json({
    byFile: stats,
    total: totalStats,
  });
});


app.get('/api/load-csv', async (req, res) => {
  try {
    if (!currentCsvFilePath || !allCsvData[currentCsvFilePath]) {
      return res.status(404).json({ error: 'No CSV file selected or data not loaded.' });
    }
    const requestedIndex = parseInt(req.query.index);
    const currentData = allCsvData[currentCsvFilePath]; // 現在のファイルデータを取得
    let firstUnlabeledIndex = await findFirstUnlabeledIndex(currentData);
    console.log("Update firstUnlabeledIndex: ", firstUnlabeledIndex);

    if (isNaN(requestedIndex)) {
    } else if (requestedIndex >= 0 && requestedIndex < currentData.length) {
        firstUnlabeledIndex = requestedIndex;
    } else {
        return res.status(400).json({ error: 'Invalid index provided.' });
    }
      
    const startIndex = Math.max(0, firstUnlabeledIndex - 5);
    const endIndex = Math.min(currentData.length - 1, firstUnlabeledIndex + 5);
    const slicedData = currentData.slice(startIndex, endIndex + 1).map((item, index) => ({
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
    if (!currentCsvFilePath || !allCsvData[currentCsvFilePath]) {
      return res.status(404).json({ error: 'No CSV file selected or data not loaded.' });
    }
    const index = parseInt(req.query.index);
    const label = req.query.label;
    allCsvData[currentCsvFilePath][index].label = label; // 現在のファイルデータを更新
    res.json({ message: 'Label updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/save-csv', async (req, res) => {
  try {
    if (!currentCsvFilePath || !allCsvData[currentCsvFilePath]) {
      return res.status(404).json({ error: 'No CSV file selected or data not loaded.' });
    }
    const csv = Papa.unparse(allCsvData[currentCsvFilePath], { header: true }); // 現在のファイルデータを保存
    await fs.writeFile(currentCsvFilePath, csv);
    console.log(`CSV file saved successfully: ${currentCsvFilePath}`);
    res.json({ message: 'CSV file saved successfully' });
  } catch (error) {
    console.error(`Failed to save CSV file ${currentCsvFilePath}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  initialize(); // サーバー起動後にすべてのCSVファイルを読み込み、キャッシュする
});