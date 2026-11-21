# pi-timeline-herdr-view

[pi-timeline](../pi-timeline) のタスクツリーを Herdr に出す mod。区間付きの進捗バー、重みで配分したツリー、クリックしたタスクの note と result を表示する。読むのは `<cwd>/timeline.json` で、これは pi-timeline が `timeline` ツール呼び出しのたびに書き出す。

[English](./README.md)

## インストール

```sh
# 1. 書き手（pi 側）
pi install @335g/pi-timeline

# 2. 表示側: このパッケージの mod フォルダを Herdr のホームへ
cp -r packages/pi-timeline-herdr-view/mods/pi-timeline-herdr-view ~/.config/herdr-app/mods/
herdr-app check ~/.config/herdr-app/mods/pi-timeline-herdr-view
```

リポジトリのチェックアウトから使うなら symlink でもよい（保存で即リロードされる）。

```sh
ln -s "$PWD/packages/pi-timeline-herdr-view/mods/pi-timeline-herdr-view" ~/.config/herdr-app/mods/
```

出し方は3通り。

| 出し方 | コマンド | キー |
|---|---|---|
| レイアウトの上に窓 | `herdr-app do mod.open --name pi-timeline-herdr-view` | `keys.json` をマージすれば `cmd-alt-t` |
| 端末の隣にペイン | `herdr-app do pane.split --direction right --mod pi-timeline-herdr-view` | — |
| 常設の列 | レイアウトにブロックを追加（[RECIPE.md](./RECIPE.md)） | `layout.toggle:<block id>` |

同梱の `keys.json` は `~/.config/herdr-app/keys.json` にマージする断片。マージすると `cmd-alt-t` で窓が開閉する。

## 読むファイル

`<cwd>/timeline.json`。書くのは書き手側で、この mod は書かない。

```json
{ "version": 1, "title": "任意の見出し", "tasks": [
  { "id": "1", "title": "Build the parser", "status": "active", "weight": 3 },
  { "id": "1.1", "title": "Lex the tokens", "parent": "1", "status": "done",
    "note": "警告色で出る", "result": "→ のあとに出る" }
] }
```

- 必須は `id` と `title`。`parent` / `weight` / `status` / `note` / `result` は任意
- `status` は `done` / `active` / `pending`（既定） / `blocked`
- 進捗は兄弟内の `weight`（既定 1）で配分し、子があれば子で測る。葉は自身の status で数える
- ファイルを固定したいときはブロックの `props.cwd` か `props.file`。既定はフォーカス中ペインのフォルダ

## 注意

- 読むだけの mod。`exec` もネットワークも使わない。`watchFolder` で監視し、タイマーは持たない
- 書き手は作業フォルダに `timeline.json` を置く。使うリポジトリの `.gitignore` に入れておく。
- Herdr の mod API はリリース間で安定しない。herdr-app 0.1.16 で確認した。壊れたら [RECIPE.md](./RECIPE.md) から作り直す
