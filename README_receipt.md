# レシート仕訳アシスタント（学生用）

レシートの写真を Gemini で読み取り、日付・店名・金額・明細を表示し、仕訳案を作成するWebアプリです。内容を確認してから、文字データと仕訳を自分の Firebase Cloud Firestore に保存します。**レシート画像はAIによる読み取りのためGoogleのサーバーへ送信されますが、Firestoreには保存しません。** 個人情報のあるレシートは使用しないでください。

## 1. 用意するもの

- Googleアカウント、Node.js、Chromeなどのブラウザ
- 自分のFirebaseプロジェクト（学生ごとに作成）
- 配布HTML：`index_receipt_anonymous_auth_save_student(1).html`（公開時は `index.html` に改名）
- インターネット接続

Firebase Console: https://console.firebase.google.com/
Google Cloud Console: https://console.cloud.google.com/

## 2. FirebaseプロジェクトとWebアプリを登録する

1. Firebase Consoleでプロジェクトを作成する。
2. プロジェクトの設定（歯車）→ **全般** → **マイアプリ** を開く。
3. Webアプリがなければ `</>` を選び登録する。
4. 表示された `firebaseConfig` の **6項目すべて** をHTMLの同名部分にコピーする。

```javascript
const firebaseConfig = {
  apiKey: "自分のAPIキー",
  authDomain: "自分のプロジェクトID.firebaseapp.com",
  projectId: "自分のプロジェクトID",
  storageBucket: "自分のStorageバケット",
  messagingSenderId: "自分の送信者ID",
  appId: "自分のアプリID"
};
```

**`apiKey`（Firebase APIキー）と、後述のFraud Defenseサイトキーは別物です。** 設定値はFirebase Consoleに表示されたものをそのまま使います。

## 3. Firebase AI Logic を利用可能にする

Firebase Consoleで **AI Logic** を開き、画面の案内に従ってGemini Developer APIを利用する設定を行います。利用規約、無料枠・課金条件を確認してください。配布HTMLではモデル名に `gemini-3.5-flash-lite` を指定しています。モデルの利用可否は環境や時期により変わります。

## 4. Fraud Defense（App Check）のサイトキーを設定する

1. Google Cloud Consoleで、**自分のFirebaseプロジェクト**が選択されていることを確認する。
2. Fraud Defense（旧称 reCAPTCHA Enterprise）の設定画面で、必要に応じてAPIを有効化する。
3. **ウェブサイト用・スコアベース**のサイトキーを作成する。登録ドメインには `自分のプロジェクトID.web.app` を指定する。カスタムドメインを使う場合はそれも登録する。
4. Firebase Console → **App Check** → Webアプリの登録画面で **Fraud Defense（reCAPTCHA Enterprise）** を選択し、作成したサイトキーを登録する。TTLは演習では1時間を目安にする。
5. HTML内の次の文字列を、自分のサイトキーに置き換える。

```javascript
provider: new ReCaptchaEnterpriseProvider("自分サイトキー"),
```

`USE_APPCHECK_DEBUG = false` は通常のHosting公開時にはそのままにします。デバッグトークンを使う場合は開発用として別途Firebase Consoleに登録し、公開版では無効にしてください。**401エラーが出ても、いきなりデバッグモードに変更しないでください。** まずプロジェクト、サイトキー、登録ドメイン、設定反映、ブラウザのキャッシュを確認します。

## 5. Authenticationの匿名認証を有効にする

Firebase Console → **Authentication** → **Sign-in method（ログイン方法）** で **匿名（Anonymous）** を有効にして保存します。

このアプリは保存時に匿名認証を行います。Firebaseはブラウザに認証情報を保持するため、同じブラウザでは通常同じUIDが使われます。別の端末・ブラウザやサイトデータ削除後はUIDが変わることがあります。**このレシートアプリはUID別の一覧表示機能を持ちません。**

## 6. Firestore Databaseを作成し、ルールを公開する

1. Firebase Console → **Firestore Database** → **データベースの作成** を選ぶ（未作成の場合）。
2. 作成後、**ルール** タブを開く。
3. 次のルールを貼り付け、**公開** する。

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
        && request.resource.data.date is string
        && request.resource.data.store is string
        && request.resource.data.total is number
        && request.resource.data.total >= 0
        && request.resource.data.paymentMethod is string
        && request.resource.data.items is list
        && (request.resource.data.journal == null || request.resource.data.journal is map)
        && request.resource.data.createdAt == request.time;
      allow read, update, delete: if false;
    }
  }
}
```

このルールは、匿名認証した利用者による `receipts` への**新規作成だけ**を許可します。アプリからの読み取り・更新・削除はできません。匿名認証は本人確認ではないため、公開URLを知る第三者による書き込みを完全には防ぎません。App Checkと利用量の監視も必要です。

## 7. Firebase Hostingで公開する（Windowsのコマンドプロンプト）

1. 作業フォルダ `receipt_ai` を作り、配布HTMLを `index.html` という名前で置く。設定値は自分のものに書き換えておく。
2. コマンドプロンプトで次を実行する。

```bat
cd %USERPROFILE%\receipt_ai
npm install -g firebase-tools
firebase login
firebase init hosting
```

初期設定の質問には次のように回答します。

| 質問 | 回答 |
|---|---|
| Are you ready to proceed? | `Y` |
| Please select an option | `Use an existing project` |
| Select a default Firebase project | 自分のプロジェクト |
| What do you want to use as your public directory? | `.`（半角ピリオド1文字） |
| Configure as a single-page app? | `N` |
| Set up automatic builds and deploys with GitHub? | `N` |
| Overwrite index.html?（表示された場合） | `N` |
| AI coding agentについての質問（表示された場合） | `N` |

**公開ディレクトリ `.` は現在の `receipt_ai` フォルダ全体を公開する指定です。** このフォルダには公開してよいファイルだけを置き、秘密情報や不要なファイルを置かないでください。

3. 公開する。

```bat
firebase deploy --only hosting
```

4. 表示された `https://自分のプロジェクトID.web.app` を開く。HTMLを変更した場合は再度 `firebase deploy --only hosting` を実行します。

## 8. 動作確認と保存先

1. PCまたはスマホで公開URLを開く。
2. レシート画像を選択・撮影して **「2. 読み取る」** を押す。
3. 読み取り結果を確認・修正する。
4. **「3. 仕訳を提案してもらう」** を押し、借方・貸方の金額と科目を確認する。
5. **「4. Firestoreに保存」** を押す。
6. 「保存しました。コレクション: receipts / 文書ID: ...」と表示されたら、Firebase Console → **Firestore Database → データ → receipts** で保存を確認する。

保存する項目は `date`, `store`, `total`, `paymentMethod`, `items`, `journal`, `createdAt` です。`receipts` コレクションは最初の保存成功時に自動作成されます。写真は保存しません。

## 9. よくあるエラー

| 症状・エラー | 確認すること |
|---|---|
| `API_KEY_INVALID` / 400 | `firebaseConfig` の `apiKey` と他の5項目が自分のプロジェクトの値か |
| App Check 401 / token invalid | Fraud Defenseサイトキー、App Check登録、ドメイン、設定反映、キャッシュ |
| `auth/configuration-not-found` / `auth/operation-not-allowed` | Authenticationの匿名認証が有効か |
| `permission-denied` | Firestoreルールを正しく貼り付けて**公開**したか |
| モデル404 | HTMLの `MODEL_NAMES` に指定したモデルが利用可能か |
| 画像を選べない・カメラが使えない | HTTPSで開いているか、ブラウザのカメラ許可、端末の対応状況 |
| 古い画面が表示される | 再デプロイし、ブラウザをハード再読み込みする |

Chromeでは `Ctrl + Shift + R` でキャッシュを無視して再読み込みできます。**「サイトデータの削除」は匿名認証情報まで消す可能性がある**ので、通常の再読み込みと区別してください。

## 10. 提出前の確認

- [ ] 自分のFirebaseプロジェクトを使っている
- [ ] `firebaseConfig` の6項目を変更した
- [ ] Fraud Defenseサイトキーを作成・登録し、HTMLにも設定した
- [ ] 匿名認証を有効にした
- [ ] Firestoreのルールを公開した
- [ ] Hosting URLから読み取りと仕訳提案が動いた
- [ ] Firestoreの `receipts` に保存された文書を確認した

**注意：** AIの出力は正解とは限りません。個人情報のある画像を送信しないでください。Firebase APIキーとFraud DefenseサイトキーはWebアプリに組み込む公開用の設定値ですが、サービスの利用制御やデータ保護は認証・App Check・Firestoreルールで行います。
