// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs'); // --- 追加: ファイルシステムモジュールをインポート ---
const path = require('path'); // --- 追加: パス操作モジュールをインポート ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- 追加: データ保存用のファイルパスを定義 ---
const DATA_FILE_PATH = path.join(__dirname, 'performance_data.json');
// --- 追加 ここまて ---

// --- 追加: 既存のデータを読み込む関数 ---
let performanceDataArray = []; // --- 追加: データを蓄積する配列 ---

function loadExistingData() {
    if (fs.existsSync(DATA_FILE_PATH)) {
        try {
            const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
            performanceDataArray = JSON.parse(data);
            console.log(`Loaded ${performanceDataArray.length} existing performance records from ${DATA_FILE_PATH}`);
        } catch (err) {
            console.error(`Error reading or parsing ${DATA_FILE_PATH}:`, err.message);
            performanceDataArray = []; // エラー時は空の配列で初期化
        }
    } else {
        console.log(`Data file ${DATA_FILE_PATH} not found. Starting with an empty array.`);
        performanceDataArray = [];
    }
}
// --- 追加 ここまて ---

// --- 追加: データをファイルに保存する関数 ---
function saveDataToFile() {
    try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(performanceDataArray, null, 2), 'utf8');
        console.log(`Saved ${performanceDataArray.length} performance records to ${DATA_FILE_PATH}`);
    } catch (err) {
        console.error(`Error writing to ${DATA_FILE_PATH}:`, err.message);
    }
}
// --- 追加 ここまて ---

// --- 修正: サーバー起動時に既存データを読み込む ---
loadExistingData(); // サーバー起動時に一度だけ実行
// --- 修正 ここまて ---
app.use(express.static(__dirname));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
app.post('/api/performance', (req, res) => {
    const performanceData = req.body;

    // --- 修正: 受け取ったデータを配列に追加 ---
    performanceDataArray.push(performanceData);
    console.log('Received and stored performance data:');
    console.log(JSON.stringify(performanceData, null, 2));
    // --- 修正 ここまて ---

    // --- 修正: データをファイルに保存 ---
    saveDataToFile(); // データ追加後に毎回保存
    // --- 修正 ここまて ---

    res.status(200).json({ message: 'Performance data received and stored successfully.' });
});

// --- 追加: データを取得するためのGETエンドポイント (オプション) ---
app.get('/api/performance', (req, res) => {
    res.status(200).json(performanceDataArray);
});
// --- 追加 ここまて ---

app.listen(PORT, () => {
    console.log(`Performance collection server is running on port ${PORT}`);
    console.log(`Data will be saved to: ${DATA_FILE_PATH}`);
});