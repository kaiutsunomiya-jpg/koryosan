# 校了さん v13｜非公開R2音源再生＋青い窓 小節シーク

## 同梱ファイル
- `Koryosan_Firebase_v13_R2_PWA_GitHubPages.zip`：GitHub Pagesに置くPWA本体
- `Koryosan_Drive_R2_Worker_v13_認証再生.zip`：既存Cloudflare Workerを置き換える**単一ファイル** `worker-drive-sync-v13.js`
- PWA内 `aoi_mado_bar_map.json`：添付MIDIから抽出した小節位置・拍子・構成マーカー

## まずCloudflare Workerを更新する（必須）
1. Cloudflare → Workers & Pages → `koryosan-drive-sync` → **Edit code**。
2. 現在のコードを保存（バックアップ）した後、`worker-drive-sync-v13.js` で全置換して **Deploy**。
3. 既存のSecrets `GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET`・`OAUTH_SETUP_PASSWORD`・`OAUTH_ENCRYPTION_KEY`、R2 Binding `AUDIO_BUCKET` → `koryosan-audio`、Cron `*/5 * * * *` は変更不要。
4. 管理画面 `https://koryosan-drive-sync.harikoryoband.workers.dev/admin` を開き、既存のDrive同期が正常に動いていることを確認する。**再初期化は不要**。
5. Workerは追加API `/api/audio/list` と `/api/audio/file` で、Firebase ID tokenの署名・プロジェクト・期限を検証し、Realtime Databaseの `members/<UID>` が `true` のユーザーのみアクセスを許可する。R2は非公開のまま。

### Firebase設定・注意
添付された本番用PWAの `firebase-config.js` は新プロジェクト `koryosan-eba1f` を指定しています。Worker内 `API_FIREBASE_PROJECT` と `API_FIREBASE_DATABASE` は、その実際の設定に揃えています。後日Firebaseを移管した場合、この2つの定数も更新してください。

PWAを `https://kaiutsunomiya-jpg.github.io/koryosan/` 以外で公開する場合、Worker Settings → Variables and Secrets の **Plain text** `PWA_ALLOWED_ORIGINS` に新しいページの **originのみ**（例：`https://harikoryoband.github.io`）を追加する。複数ならカンマ区切り。末尾の `/koryosan` 等のパスは入れない。秘密鍵は登録しない。

### セキュリティ確認
- ブラウザでWorkerの `/api/audio/list?songId=ky-05` を直接開いても、認証ヘッダーなしでは **401** が正常。
- `/_private/...` のダウンロードAPIは存在しない。`/api/audio/file?key=_private/...` は拒否される。
- MP3データは、正規にログインしたメンバーのブラウザからWorkerへBearerトークンを送信して受け取る。トークンはURLには書かない。
- Workerコードは **GitHubのPWA公開リポジトリに置かない**（必要はない）。

## 次にGitHub Pagesへv13を公開
1. Firebase Realtime DatabaseのJSONバックアップを保存する（今回はDBを変更しません）。
2. `Koryosan_Firebase_v13_R2_PWA_GitHubPages.zip` を解凍し、`koryosan-main` **フォルダ内のファイル・フォルダ**を本番 `koryosan` GitHubリポジトリのルートに上書きアップロードする。
3. 新規ファイルは `r2-audio-client.js`、`r2-bar-player.js`、`r2-bar-player.css`、`aoi_mado_bar_map.json`。これら4つもアップロードすること。
4. GitHub Pagesが再公開されたら `https://kaiutsunomiya-jpg.github.io/koryosan/` を開き、左下の **v13** を確認する。
5. Firebaseアカウントでログイン → **曲リスト → 青い窓 → 小節指定プレーヤー・音源一覧**。
6. 音源を選択し、小節番号・±1/±4・小節スライダー・MIDIマーカーからのシークを確認する。音声が一致しなければ「音源の開始ずれ」を曲データに合わせて補正する（端末・ファイルごとに記憶）。
7. ほかの5曲にも「R2音源一覧・再生」ボタンを追加（小節マップがないので普通のシークのみ）。

## 小節マップの精度・制限
添付 `【拍子メタデータMIDI】青い窓_20260818.mid` から、tick 480、200 BPM、13回の拍子指定、10個の構成マーカー、**227個の小節開始点（最後は不完全小節）** を抽出しています。
MIDIの終了は **227.7秒**。曲リストの登録演奏時間 **225秒（3:45）** と差があります。音源の実際の演奏とMIDIの拍子・テンポが一致する場合のみ小節位置が正確です。別テイク、無音、テンポ変更のある音源に適用するとズレます。

特にMIDIには `1D`、`2C` のマーカーがありますが、現在の歌詞テーブルの構成とは一致しない箇所があります。勝手に歌詞を再対応付けせず、**マーカーをMIDIの表記のまま表示**。歌詞・追記メモは構成名が一致する箇所のみ表示します。

## キャッシュ
再生するMP3/WAVは**最初にファイル全体を取得してから**HTML5 Audioで再生する方式です。1ファイル最大80MBまでIndexedDBへ保存し、取得後72時間以内なら同じファイルの再読込を減らします。更新版はETagをキーに使いキャッシュを分けます。iOS等では容量不足・ブラウザ側の整理で72時間以内に削除される場合があります。
端末を共有する場合、キャッシュされた音声がブラウザのストレージに残る点に注意してください。

## データベース変更
**JSONの再インポート・Firebaseルールの変更は不要**です。音声ファイルはR2、ログインと既存の曲データ・追記メモはFirebaseで扱います。

## 検証状況
- MIDIのテンポ・拍子・マーカーを解析し、227小節の開始時刻を生成。
- PC 1280px、スマホ390px・320pxでモーダル表示・小節指定・構成マーカー・閉じる操作をブラウザ模擬テスト。
- Workerの署名付きJWTの検証・UID許可・未認証拒否・音声以外のR2キー拒否・CORS検証を模擬テスト。
- 実際のFirebase／Google Drive／Cloudflareへの接続および本番音声の再生は、現在の管理アカウントへアクセスできないため未検証。
