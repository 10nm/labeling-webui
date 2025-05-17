# Labeling_webUI

テキストデータの二値ラベリングのためのWebUI  
サーバーサイドcsvのラベリングが可能

## 使いかた

1. リポジトリをクローン
```bash
git clone https://github.com/10nm/labeling_webui.git
cd labeling_webui
```

2. 依存関係をインストール
```bash
npm install
```

3. configの設定  

編集するcsvのパスを設定
```js
module.exports = {
  csvFilePath: '{path_to_csv}',
};
```

4. サーバーの起動
```bash
node index.js
```

5. ブラウザからアクセス  
http://localhost:3000
