# 校了さん v12｜曲詳細・追記メモの3行構成

## 変更点

追記メモのヘッダーを上から次の3行に整理しました。

1. **更新内容タイトル**：従来の追記メモタイトルを直接編集
2. **MP3名**：ファイル名の直接入力と、Google Drive共有リンクの再生・編集
3. **自由記述**：更新全体に関する備考・説明を直接編集

既存の「構成」「歌詞」は3行をまたぐ結合表示のままです。構成ごとのコメント行も保持されます。

### Google Driveのリンク操作

2行目の小さいフォルダアイコンを押すと、既存のDriveリンクを確認・変更できる入力欄が開きます。
DriveのMP3/WAVファイルへの共有リンクが登録されている場合は「Driveで再生」を表示し、押すとDriveのプレビューを開きます。
一般の共有URLは「Driveで開く」として表示します。
Google Driveの共有URLだけから実際のMP3ファイル名を取得することはできないため、MP3名は手入力です。

### Firebase保存先と互換性

データ構造は変更しません。以下の既存フィールドをそのまま使用します。

- `bands/koryosan/songNotes/{songId}/columns/{columnId}/title`  … 1行目
- `bands/koryosan/songNotes/{songId}/columns/{columnId}/filename`  … 2行目
- `bands/koryosan/songNotes/{songId}/columns/{columnId}/overall`  … 3行目
- `bands/koryosan/songNotes/{songId}/columns/{columnId}/description` … Drive共有リンク（2行目のリンク編集からアクセス）

3行とも600msの遅延保存（入力欄を離れたときは即時保存）です。
既存の列名、URL、個別構成コメントは保持されます。Firebase JSONインポートやルールの変更は不要です。

### 公開手順

1. Firebase Realtime DatabaseからJSONをバックアップ。
2. ZIPを解凍し、**ルートのファイルと`icons/`フォルダ**を `koryosan` GitHubリポジトリに上書きアップロード。
3. ActionsによるPages公開が完了してから、アプリ左下に「v12」が表示されるか確認。
4. 曲詳細で既存メモ、MP3名編集、リンクボタン、自由記述保存が機能するか確認。

⚠️ 本配布物にFirebase初期歌詞JSONは含みません。認証済みユーザーのみデータを読める既存構成を維持しています。

## テスト結果

- Node.jsによるJavaScript構文確認
- ChromiumでPC 1280px、スマホ 390px、320pxのUI表示をオフライン検証
- `title`、`filename`、`overall` のFirebase差分のみが生成されることを確認
- 既存のMP3リンクとそのプレビューUI、リンク編集欄の開閉を確認

実Firebase接続での書き込み、実際のGoogle Drive再生、iPhone実機の表示は公開後の確認が必要です。

※添付の `SaiwaiSan.zip` を参照しましたが、同アーカイブはSwiftUIの持ち曲管理アプリであり、歌詞・追記メモを表示する同型の曲詳細画面は含まれていません。そのため、具体的に指定された3行構造を優先して再構成しています。
