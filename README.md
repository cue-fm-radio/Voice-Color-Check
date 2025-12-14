<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voice Color Check (声診断アプリ)

話し声からあなたの「カラータイプ」を AI が診断する Web アプリケーションです。
フロントエンドは React (Vite)、バックエンドは Cloudflare Workers を使用しています。

---

## 🛠️ 環境構築手順 

このプロジェクトをローカル環境で動かすための手順です。
大きく分けて **「バックエンド (Worker)」** と **「フロントエンド」** の2つの設定が必要です。

### 事前準備
1.  **Node.js のインストール**
    *   [公式サイト](https://nodejs.org/) から推奨版 (LTS) をインストールしてください。
2.  **Cloudflare アカウントの作成**
    *   [Cloudflare](https://www.cloudflare.com/ja-jp/) で無料アカウントを作成してください。
    *   (R2ストレージを利用する場合、クレジットカード登録が必要な場合がありますが、無料枠内で十分運用可能です)

---

### 1. バックエンド (Cloudflare Worker) の設定

AI (Gemini) へのアクセスと画像の保存を担当するサーバー側の設定です。

1.  **ターミナルで `worker` ディレクトリに移動**
    ```bash
    cd worker
    ```

2.  **依存関係のインストール**
    ```bash
    npm install
    ```

3.  **Cloudflare にログイン**
    ```bash
    npx wrangler login
    ```
    *   ブラウザが開くので、「Allow」をクリックして認証してください。

4.  **Worker のデプロイ (アップロード)**
    ```bash
    npx wrangler deploy
    ```
    *   成功すると、`https://voice-color-check-worker.<あなたのアカウント>.workers.dev` のような URL が表示されます。**この URL をメモしておいてください。**

5.  **APIキーの設定 (重要)**
    Gemini API キーを安全に Worker に保存します。
    ```bash
    npx wrangler secret put GEMINI_API_KEY
    ```
    *   プロンプトが表示されたら、Google AI Studio で取得した **Gemini API キー** を入力(ペースト)して Enter を押してください。

---

### 2. フロントエンドの設定

Web 画面の設定です。

1.  **プロジェクトのルートディレクトリに戻る**
    ```bash
    cd ..
    ```
    (もし `worker` ディレクトリにいる場合)

2.  **依存関係のインストール**
    ```bash
    npm install
    ```

3.  **環境変数の設定**
    プロジェクト直下に `.env.local` という名前でファイルを作成し、以下の内容を記述してください。
    (`WORKER_URL` には、先ほどメモした Worker の URL を貼り付けます)

    ```text
    VITE_WORKER_URL=https://voice-color-check-worker.<あなたのアカウント>.workers.dev
    ```

4.  **アプリの起動**
    ```bash
    npm run dev
    ```

5.  **ブラウザで確認**
    ターミナルに表示される URL (例: `http://localhost:3000`) にアクセスして、マイクの使用を許可し、診断ができるか試してみてください。

---

## 🚀 デプロイ (本番公開) について

### フロントエンド (Vercelなどで公開する場合)
GitHub にプッシュして Vercel 等と連携する場合、Vercel 側の「Environment Variables (環境変数)」設定画面で以下を設定してください。

*   **Key**: `VITE_WORKER_URL`
*   **Value**: (あなたの Worker の URL)

これで、Web 上でも診断アプリが動作します。

## ⚠️ 注意事項
*   **APIキーの管理**: `GEMINI_API_KEY` は絶対に GitHub などの公開場所に書かないでください。必ず `npx wrangler secret put` で設定してください。
*   **gitignore**: `dist/` フォルダなどがアップロードされないよう設定されています。これを変更してビルド成果物をリポジトリに含めないようにしてください。
