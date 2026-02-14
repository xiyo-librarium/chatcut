# チャットカット (Chat Cut) - セットアップ＆公開ガイド

## 全体の流れ

```
① 準備（10分） → ② ローカルで動かす（5分） → ③ GitHubにアップ（5分） → ④ 公開！（3分）
```

---

## ① 準備するもの

### 1. Node.js をインストール

https://nodejs.org/ にアクセスして **LTS版（推奨版）** をダウンロード＆インストール。

インストール確認（VS Codeのターミナルで実行）：
```bash
node -v
npm -v
```
バージョン番号が出ればOK。

### 2. Git をインストール

https://git-scm.com/ からダウンロード＆インストール。
（Windowsの場合、インストール中の設定はすべてデフォルトでOK）

確認：
```bash
git -v
```

### 3. GitHub アカウント

https://github.com/ でアカウントを作成（無料）。

### 4. Vercel アカウント

https://vercel.com/ で「Sign Up」→「Continue with GitHub」でGitHubと連携。

---

## ② ローカルで動かす

### 1. プロジェクトフォルダを開く

VS Codeで、この `chatcut-project` フォルダを開く。
（「ファイル」→「フォルダーを開く」→ chatcut-project を選択）

### 2. ターミナルを開く

VS Codeの上部メニュー →「ターミナル」→「新しいターミナル」

### 3. 依存パッケージをインストール

```bash
npm install
```
（初回のみ。node_modules フォルダが作られます）

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザが自動で開いて http://localhost:3000 にチャットカットが表示されます！

**止めるとき** → ターミナルで `Ctrl + C`

---

## ③ GitHubにアップする

### 1. GitHubで新しいリポジトリを作成

1. https://github.com/new にアクセス
2. Repository name: `chatcut` と入力
3. Public を選択
4. 「Create repository」をクリック

### 2. ローカルからプッシュ

VS Codeのターミナルで以下を順番に実行：

```bash
git init
git add .
git commit -m "Initial commit: Chat Cut v1.0"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/chatcut.git
git push -u origin main
```

※ 「あなたのユーザー名」の部分はGitHubのユーザー名に置き換えてください。
※ 初回はGitHubのログインが求められます。

---

## ④ Vercelで公開する（無料！）

### 1. Vercelにログイン

https://vercel.com/ → GitHubでログイン

### 2. プロジェクトをインポート

1. 「Add New...」→「Project」
2. GitHubリポジトリ一覧から `chatcut` を選択
3. 設定画面が出る →**何も変えずにそのまま「Deploy」をクリック**

Vercelが自動でビルド＆デプロイしてくれます（1〜2分）。

### 3. 公開完了！

デプロイ完了後、`https://chatcut-xxxxx.vercel.app` のようなURLが表示されます。
これがチャットカットの公開URLです！

---

## ⑤ カスタムドメインを設定する（任意）

`chatcut.app` のような独自ドメインを使いたい場合：

1. ドメインを購入（おすすめ: https://domains.google.com/ や https://www.namecheap.com/）
2. Vercelのプロジェクト設定 →「Domains」→ ドメインを追加
3. ドメイン側のDNS設定で、Vercelが指示するレコードを追加

※ドメイン費用は年間1,000〜3,000円程度です。

---

## よく使うコマンドまとめ

| やりたいこと | コマンド |
|---|---|
| 開発サーバー起動 | `npm run dev` |
| 本番用ビルド | `npm run build` |
| ビルド結果を確認 | `npm run preview` |
| 変更をGitHubに反映 | `git add . && git commit -m "メッセージ" && git push` |

Vercelは、GitHubにプッシュするだけで自動的に再デプロイされます。
つまり、コードを修正 → `git push` → 数秒で公開版に反映！

---

## トラブルシューティング

### `npm install` でエラーが出る
→ Node.jsのバージョンが古い可能性。https://nodejs.org/ から最新LTSを再インストール。

### `git push` でエラーが出る
→ `git remote -v` でURLが正しいか確認。GitHubのユーザー名とリポジトリ名が合っているかチェック。

### Vercelでビルドが失敗する
→ Vercelのログを確認。ほとんどの場合、`npm run build` をローカルで実行してエラーがないか確認すれば解決します。

---

## プロジェクト構成

```
chatcut-project/
├── index.html          ← エントリーポイント
├── package.json        ← パッケージ設定
├── vite.config.js      ← ビルドツール設定
├── .gitignore          ← Git除外設定
├── public/
│   ├── manifest.json   ← PWA設定
│   ├── icon-192.png    ← アプリアイコン（小）
│   └── icon-512.png    ← アプリアイコン（大）
└── src/
    ├── main.jsx        ← Reactのエントリー
    ├── App.jsx         ← チャットカット本体（全機能）
    └── index.css       ← グローバルCSS
```
