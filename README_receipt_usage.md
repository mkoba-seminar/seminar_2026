# レシート仕訳アシスタント — 使い方

この説明書は `index_receipt_anonymous_auth_save_student(2).html` 用です。レシート画像をAIで読み取り、仕訳案を作り、文字データをCloud Firestoreに保存します。

## 1. 初回設定

このHTMLは配布時のままでは動きません。学生自身のFirebaseプロジェクトで次の準備をします。

1. Firebase Consoleでプロジェクトを作り、Webアプリを登録する。
2. **プロジェクトの設定 → 全般 → マイアプリ** の `firebaseConfig` から6項目をコピーし、HTMLの `firebaseConfig` に書き込む（`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`）。
3. Firebaseの **AI Logic** を利用できるように設定する。HTMLのモデル指定は `gemini-3.5-flash-lite`。利用可能なモデルはFirebase側で確認する。
4. Google Cloudで **Fraud Defense（旧reCAPTCHA Enterprise）** のWeb用サイトキーを作成し、公開するHostingドメイン（例：`自分のプロジェクトID.web.app`）を登録する。Firebase Consoleの **App Check** でWebアプリにそのサイトキーを登録する。
5. HTMLの `new ReCaptchaEnterpriseProvider("自分サイトキー")` を実際のサイトキーに置き換える。通常は `USE_APPCHECK_DEBUG = false` のまま使う。
6. Firebase Consoleの **Authentication → ログイン方法** で **匿名** を有効にする。
7. **Firestore Database** を作成し、次のルールを貼り付けて**公開**する。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /receipts/{id} {
      allow create: if request.auth != null
        && request.resource.data.keys().hasAll([
          'date', 'store', 'total', 'paymentMethod',
          'items', 'journal', 'createdAt'
        ])
        && request.resource.data.keys().hasOnly([
          'date', 'store', 'total', 'paymentMethod',
          'items', 'journal', 'createdAt'
        ])
        && request.resource.data.total is number
        && request.resource.data.total >= 0
        && request.resource.data.items is list
        && request.resource.data.createdAt == request.time;
      allow read, update, delete: if false;
    }
  }
}
```

このルールはアプリからの新規作成のみを許可します。保存済みデータの閲覧はFirebase Consoleで行います。

## 2. Firebase Hostingで公開する

PCの作業フォルダ（例：`receipt_ai`）にHTMLを **`index.html`** という名前で保存します。Node.jsとFirebase CLIを利用できる環境で、コマンドプロンプトから実行します。

```bat
cd %USERPROFILE%\receipt_ai
npm install -g firebase-tools
firebase login
firebase init hosting
```

初期設定の質問には、既存プロジェクトを選択し、公開ディレクトリに **`.`（半角ピリオド1文字）**、single-page appに **N**、GitHub自動デプロイに **N**、`index.html` の上書きに **N**、AI coding agentの質問があれば **N** と回答します。`npm install` と `firebase login` は通常初回だけで構いません。

```bat
firebase deploy --only hosting
```

完了時に表示される `https://自分のプロジェクトID.web.app` をブラウザで開きます。修正後は再度 `firebase deploy --only hosting` を実行してください。

## 3. アプリの操作

1. **「ファイルを選択」** でレシート写真を指定します。対応するスマートフォンではカメラ撮影もできます。
2. **「2. 読み取る」** を押します。AIが購入日、店名、税込合計、支払方法、品名と金額を抽出します。
3. **読み取り結果を確認・修正**します。明細合計と合計金額が異なる場合は警告が表示されます。
4. **「3. 仕訳を提案してもらう」** を押します。AIが借方・貸方、勘定科目、金額と理由を提案します。借方・貸方の合計が一致しない場合は警告が出ます。仕訳案は画面上で直接編集できません。
5. **「4. Firestoreに保存」** を押します。成功すると `receipts` と文書IDが表示されます。仕訳を作る前でもレシート情報のみ保存でき、その場合 `journal` は `null` です。

**注意：** レシート画像はAIによる解析のためGoogleのサーバーへ送信されますが、Firestoreには保存されません。氏名・住所などの個人情報が含まれる画像は使用しないでください。AIの出力は必ず確認してください。

## 4. 保存先と認証

保存先は、自分のFirebaseプロジェクトの **Firestore Database → データ → `receipts`** です。保存されるのは `date`, `store`, `total`, `paymentMethod`, `items`, `journal`, `createdAt` の7項目です。文書IDは自動発行されます。

保存時にはFirebase匿名認証が行われます。認証情報は通常ブラウザ内に保持されますが、別端末・別ブラウザでは別のUIDになることがあります。このアプリはUIDごとにレシートを分類しておらず、保存済みレシートをアプリから読み直す機能もありません。端末を変更してもFirestoreの保存済みデータは消えません。

## 5. よくあるエラー

| 表示・症状 | 確認すること |
| --- | --- |
| `API_KEY_INVALID` / 400 | `firebaseConfig` のAPIキーなど6項目を自分のWebアプリの値にしたか |
| App Check / 401 | Fraud Defenseサイトキー、登録ドメイン、App Check登録を確認。設定直後なら少し待って再読み込み |
| `auth/operation-not-allowed` | Authenticationで匿名認証を有効にしたか |
| `permission-denied` | Firestoreのルールを公開したか、`receipts` の `create` が許可されているか |
| AIのモデルに関する404 | 指定モデルが現在利用可能か確認 |
| 変更が反映されない | Hostingへ再デプロイし、ブラウザでキャッシュを無視して再読み込み |

## 6. 提出前の確認

- 公開URLでレシートを読み取れる。
- 読み取り結果の誤りを確認し、必要なら修正した。
- 仕訳を生成し、借方・貸方の金額を確認した。
- Firestore保存後に文書IDが表示された。
- Firebase Consoleの `receipts` に保存データがある。

このREADMEは、添付されたHTMLの動作に合わせた操作説明です。Firebaseの画面名やモデルの提供状況は変更される場合があります。
