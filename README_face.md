# 顔照合デモ

ブラウザで動く顔照合のデモです。1回目に顔を登録し、2回目以降は「同じ人かどうか」を判定します。
顔画像は、どちらの版でも保存も送信もしません。違いは、登録データの保存先です。

| ファイル | 版 | 登録データの保存先 | 必要なもの |
|---|---|---|---|
| `index.html` | ローカル版 | このブラウザの localStorage だけ | なし |
| `index_face_save_student.html` | Firebase 保存版（学生用） | 自分の Firebase（Firestore）。判定ログも残る | 自分の Firebase プロジェクトと、設定値の書き換え |

自分の顔だけで試してください。

## 動かし方（共通）

カメラを使うため、`https://` か `http://localhost` で開く必要があります。HTMLファイルをダブルクリックして開くと、ブラウザによってはカメラが使えません。次のどちらかで開いてください。

顔認識のライブラリとモデルをインターネットから読み込むので、ネットに接続しておいてください（初回は数秒かかります）。

### A. 自分のパソコンで開く（練習はこちら）

1. [Node.js](https://nodejs.org/) を入れておく
2. このフォルダ（HTMLファイルがある場所）でターミナルを開き、次を実行する

   ```bash
   npx serve
   ```

   初回は「serve をインストールしますか」と聞かれるので `y` を押します。
3. 表示された `http://localhost:3000` を開く（ポート番号が違う場合は、表示された方を開く）
   - ローカル版は `http://localhost:3000/index.html`
   - 保存版は `http://localhost:3000/index_face_save_student.html`
4. 終わるときは、ターミナルで `Ctrl + C` を押す

### B. GitHub Pages で公開して開く

1. このリポジトリの **Settings → Pages** を開く
2. **Source** を「Deploy from a branch」にし、ブランチ `main`、フォルダ `/ (root)` を選んで **Save**
3. 数分後に表示される `https://ユーザー名.github.io/リポジトリ名/` に、ファイル名を付けて開く
   - 例：`https://ユーザー名.github.io/リポジトリ名/index_face_save_student.html`
4. 保存版は、`ユーザー名.github.io` を Firebase の「承認済みドメイン」に追加しておく（下の準備の手順4）

### C. Firebase Hosting で公開して開く（保存版はこちらが簡単）

保存版を、自分の Firebase プロジェクトの上で動かす方法です。Firebase の Hosting は、無料の Spark プランで使えます。承認済みドメインの追加も、通常は不要です。

事前に、下の「Firebase 保存版」の「準備」の手順1〜5（プロジェクト作成、設定値の書き換え、匿名ログイン、Firestore のルールなど）を済ませておいてください。

1. [Node.js](https://nodejs.org/) を入れたうえで、Firebase CLI を入れる

   ```bash
   npm install -g firebase-tools
   ```

2. Firebase にログインする（ブラウザが開くので、Firebase を使う Google アカウントを選ぶ）

   ```bash
   firebase login
   ```

3. このフォルダで、Hosting の設定を作る

   ```bash
   firebase init hosting
   ```

   聞かれる内容は、次のように答えます。

   | 質問 | 答え |
   |---|---|
   | プロジェクトをどうするか | 「Use an existing project」を選び、自分のプロジェクトを選ぶ |
   | public directory（公開するフォルダ） | `public` |
   | single-page app にするか | `N` |
   | GitHub での自動ビルド・デプロイを設定するか | `N` |

4. 保存版のファイルを、公開フォルダに `index.html` という名前でコピーする（`firebaseConfig` を書き換えたあとのファイルを使う）

   ```bash
   cp index_face_save_student.html public/index.html
   ```

   Windows のコマンドプロンプトでは、`copy index_face_save_student.html public\index.html` です。`public/index.html` はすでにあるので、上書きしてかまいません。
5. 公開する

   ```bash
   firebase deploy --only hosting
   ```

6. 最後に表示される **Hosting URL**（`https://プロジェクトID.web.app`）を開く

HTMLファイルを直したら、もう一度手順4と5を行うと、公開したページが更新されます。

`public` フォルダには、公開してよいファイルだけを入れてください。`README.md` などは入れません。

## 使い方（共通の操作）

1. ページを開き、カメラの使用を **許可** する
2. 「準備中...」が消えて、ボタンが押せるようになるまで待つ
3. **1回目**：正面を向いて「撮影して登録（1回目）」を押す（約1秒、動かない）
   - 「登録しました」と表示されれば完了です
4. **2回目以降**：「撮影して本人確認」を押す
   - 「同一人物です」または「別人の可能性があります」と、距離の値が表示されます
5. 登録を消したいときは、削除ボタンを押す

### しきい値と距離

- 距離は、登録した顔と今撮った顔の違いです。**小さいほど似ています**。
- 距離がしきい値より小さければ「同一人物」と判定します（初期値 0.5）。
- 目安は、同一人物で 0.4 前後以下です。
- 別人なのに「同一人物」と出る場合はしきい値を小さく、本人なのに「別人」と出る場合は大きくしてください（0.2〜0.9）。

## ローカル版（`index.html`）

- 保存するのは、顔の特徴ベクトル（128個の数値）だけで、このブラウザの localStorage に入ります。
- 外部サーバーへのデータ送信はありません。
- 削除ボタンは「登録データを削除」です。
- 登録データは、そのブラウザ・そのURLの中だけに保存されます。別のブラウザや別のURL（例：`localhost` と GitHub Pages）では、再度登録が必要です。
- ブラウザの閲覧データ（サイトデータ）を消すと、登録も消えます。

## Firebase 保存版・学生用（`index_face_save_student.html`）

特徴ベクトルと判定ログを、**自分の** Firebase（Google のクラウド）に保存します。同じ端末・同じブラウザなら、ページを開き直しても登録が残ります。

このファイルには、Firebase の設定値が入っていません（`YOUR_...` のままです）。自分のプロジェクトの値に書き換えないと動きません。

### 保存されるもの

| 場所 | 内容 |
|---|---|
| Firestore `faceUsers/{uid}` | 特徴ベクトル（128個の数値）、登録日時 |
| Firestore `faceUsers/{uid}/checks/{id}` | 判定ログ（一致か不一致か、距離、しきい値、日時） |

`{uid}` は、匿名ログインで自動に作られるIDです。名前やメールアドレスは使いません。顔画像は保存しません。

画面には、判定ログの直近5件が表示されます。削除ボタンは「登録データとログを削除（最初からやり直す）」で、登録データとログをすべて消します。

### 準備

1. **Firebase プロジェクトを作る**
   - [Firebase コンソール](https://console.firebase.google.com/) で、自分のプロジェクトを作る
   - 「プロジェクトの設定」→「マイアプリ」で、ウェブアプリ（`</>`）を追加する
2. **設定値を書き換える**
   - ウェブアプリの構成に表示される値を、`index_face_save_student.html` の `firebaseConfig` の `YOUR_...` の部分にコピーする
   - 自分のプロジェクトの値だけを使うこと
3. **匿名ログインを有効にする**
   - 「Authentication」→「Sign-in method」→「匿名」を有効にする
4. **承認済みドメインを確認する**
   - 「Authentication」→「設定」→「承認済みドメイン」に `localhost` があることを確認する
   - GitHub Pages で開くときは、`ユーザー名.github.io` を追加する
5. **Firestore を作り、ルールを設定する**
   - 「Firestore Database」を作成し、「ルール」に、自分のデータだけ読み書きできる設定を入れる（例）

     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /faceUsers/{uid} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
           match /checks/{checkId} {
             allow read, write: if request.auth != null && request.auth.uid == uid;
           }
         }
       }
     }
     ```
6. **App Check（練習用の設定）**
   - ファイルの `USE_APPCHECK_DEBUG` が `true`（初期値）のとき、App Check はデバッグ用のトークンで動きます
   - ページを開き、ブラウザの開発者ツールのコンソールに出る「App Check debug token」をコピーする
   - Firebase コンソールの「App Check」で、このウェブアプリの「デバッグトークンを管理」に、そのトークンを登録する
   - App Check を「適用（Enforce）」していない場合は、この手順がなくても動くことがあります

### 動かす

1. 次のどちらかで開く
   - **練習**：上の「動かし方」の A で、`http://localhost:3000/index_face_save_student.html` を開く
   - **Firebase 上で動かす**：上の「動かし方」の C で公開し、`https://プロジェクトID.web.app` を開く
2. カメラを許可し、「撮影して登録（1回目）」を押す
3. 2回目以降は「撮影して本人確認」を押す。判定ログが画面に出る

### うまくいかないとき（保存版）

| 画面に出るメッセージ・症状 | 対処 |
|---|---|
| `firebaseConfig の値を、自分のプロジェクトの値に書き換えましたか？` | `YOUR_...` のままになっていないか確認し、自分の値を貼る |
| `auth/operation-not-allowed` | Authentication で「匿名」を有効にする |
| `permission-denied` | Firestore のルールに `faceUsers` の許可を追加する（上の例） |
| 401 エラー（App Check） | 準備の6のとおり、コンソールのデバッグトークンを Firebase コンソールに登録する |
| `auth/unauthorized-domain` | 承認済みドメインに、いま開いているドメインを追加する |
| `firebase: command not found` | Firebase CLI が入っていません。`npm install -g firebase-tools` を実行する |
| Hosting のURLに、Firebase の初期ページが出る | `public/index.html` を、`firebaseConfig` を書き換えた保存版のファイルで上書きし、もう一度 `firebase deploy --only hosting` を実行する |
| 登録が消えた・見つからない | 下の「注意」を参照 |

### 注意（保存版）

- 匿名ログインは、ブラウザごとにIDが決まります。ブラウザのサイトデータを消したり、別のブラウザやURLで開いたりすると、別のIDになり、保存済みの登録データに結び付かなくなります。
- その場合、古いデータはFirestoreに残ったままになります。データを消したいときは、サイトデータを消す前に、画面の削除ボタンを使ってください。
- `USE_APPCHECK_DEBUG` が `true` の間は、練習用の設定です。公開して使う場合は `false` にして、`RECAPTCHA_ENTERPRISE_SITE_KEY` を自分の reCAPTCHA Enterprise のサイトキーに書き換えてください。
- `firebaseConfig` の値は、Webアプリでは公開される前提の識別情報で、秘密の鍵ではありません。データを守るのは、Firestore のルールと App Check です。ルールを設定せずに公開しないでください。
- 顔の特徴データは、Firebase（外部のサーバー）に保存されます。ローカル版のように、手元だけで完結する版ではありません。

## 共通の注意

- 初回に読み込むライブラリとモデルは、jsDelivr から取得します。
- これはデモです。写真や動画によるなりすましは防げないので、本人確認やログインなどの安全が必要な用途には使わないでください。
- 顔の特徴データは個人情報にあたります。他人の顔は、本人の同意なしに登録しないでください。

## うまくいかないとき（共通）

| 症状 | 対処 |
|---|---|
| 「顔を検出できませんでした」 | 明るい場所で、正面を向き、カメラに近づく。帽子やマスクを外す |
| カメラが起動しない | カメラの許可を確認する。`https://` か `localhost` で開いているか確認する |
| 「エラー: ...」と表示される | ネットに接続されているか確認し、ページを再読み込みする |
| 本人でも別人と出る | 登録時と同じような明るさ・向きで撮る。しきい値を少し大きくする |
