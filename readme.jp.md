<div align="center" style="display: flex; justify-content: space-around; margin : 20px">
  <img src="shots/jest-seeklogo.com.svg" height="120">
  <span style="font-size: 80px">▶︎</span>
  <img src="shots/uvu.jpg" alt="uvu" height="120" />
</div>

<div align="center">
  <a href="https://npmjs.org/package/uvu-jest">
    <img src="https://badgen.now.sh/npm/v/uvu-jest" alt="version" />
  </a>
  <a href="https://npmjs.org/package/uvu-jest">
    <img src="https://badgen.now.sh/npm/dm/uvu-jest" alt="downloads" />
  </a>
  <a href="https://packagephobia.now.sh/result?p=uvu-jest">
    <img src="https://packagephobia.now.sh/badge?p=uvu-jest" alt="install size" />
  </a>
</div>

<div align="center">
  <b>uvu-jest</b> は既存のJestで書かれたテストコードを、uvuをフォークした独自の軽量で高速なテストランナーで実行するツールです。<br>
</div>

## Why

 2022年現在、Node.js環境のユニット・統合テストにはJestが多く採用されておりますが、中小規模のユースケースではオーバースペックであったり重すぎることが多く、より軽量かつ高速なテストランナーを利用してDX(開発体験)を向上させたいと考える開発者も少なくないと思われます。

 そこで、私は最近 [`uvu`](https://github.com/lukeed/uvu) という超軽量で高速なテストランナーを見つけました。スタートアップが超高速で、最低限の機能が実装され、利用しやすいAPIインターフェイスがあり、非常に感銘を受けました。

一方で、uvuはまだ0系のライブラリになっており、Jestを利用する既存のプロダクトへの導入を考えると、Jestの安定性や高機能性とのトレードオフで簡単にuvuに載せ替える選択ができない場合も多いと考えます。

以上のことから、既存のJestで書かれたテストコードを`uvu`ライクなテストランナーで動かせるコードに変換し、高速なテスト実行を実現したいと考えました。

## 制限

- テストファイル名は `*.spec.ts`、`*.spec.js` の形式である必要があります。

## 使い方


> [examples](./examples) のデモも参考にしてください。

1. パッケージをインストール

```bash
npm i -D uvu-jest uvu-jest-ts-plugin ttypescript
```

2. tsconfig.**ttsc**.jsonを作成

```json
{
  "compilerOptions": {
    // 変換用のプラグインを指定します
    "plugins": [{"transform": "uvu-jest-ts-plugin"}],
    "outDir": "./dist-uvu",
    "target": "ESNext"
  }
}
```

3. 既存のJestで書かれたテストファイル変換する

```bash
npx ttsc -p tsconfig.ttsc.json
# dist-uvu ディレクトリが作成されます
```

4. テストを実行する

4.1 CLIを利用する

```bash
npx uj dist-uvu spec
```

コマンドの引数は、第一引数にディレクトリ、第二引数に任意でパターンを指定します。
(ディレクトリの中で、指定したパターンにマッチするテストが実行されます。)

その他のCLIコマンドの機能に関しては、[uvuのドキュメント](https://github.com/lukeed/uvu/blob/master/docs/cli.md) を参照してください。

4.2 直接nodeで実行する

```bash
node dist-uvu/{hoge}/{huga}/{piyo}.js
```

## 設定ファイル

プロジェクトルートに配置した `uvu-jest.config.js` に対応しています。

example

```typescript
module.exports = {
  setupFiles: ['dist-uvu/jestSetUp.js'],
  snapshotResolver: 'test/snapshotResolver.js',
  customMatchers: '@testing-library/jest-dom/matchers',
};
```

- setupFiles
  - JestのsetupFilesと同様にテストの実行前に実行するファイルを指定できます。
  - (環境変数の変更などをおこないます。)
- snapshotResolver
  - jestのsnapshotResolverと同様に、テストファイルに対するsnapshotファイルの保存先を変更できます。
  - resolveSnapshotPathにのみ対応しています。
- customMatchers
  - expectにMatcherを追加します
  - `Record<string, MatcherFn>`の形式でexportされている想定です。

## 動作の仕組み

### 1. なぜuvuをフォークしたか?

本当はuvuをそのまま利用できればよかったのですが、Jestで書かれたテストをuvuに書き換える際に一点困難な点があったのが最大に理由です。
Jestでは`afterAll`というライフサイクルHookが利用できますが、describeでネストさせることが可能です。uvuにも`suite.after`というhookがありますが、下記の様なネストされたケースの実行順序を再現することは出来ません。

```typescript
describe('desc1', () => {
  afterAll(() => { /* after all 1 */})
  test('test1', () => {});
  describe('desc2', () => {
    afterAll(() => { /* after all 2 */})
    test('test2', () => {});
  });
});
```

この場合の実行順序は、`test1 => test2 => after all 2 => after all 1` です。この様にafterAllはdescribeの各階層ごとにライフサイクルを指定しているので、ネストする機能がないとJestのコードを書き換えることが出来ません。しかしながら、uvuでのネスト機能は依然として [議論中](https://github.com/lukeed/uvu/issues/43) でした。

そこで、uvuをフォークして、新たに `suite.nest` という関数を追加することにしました。

### 2. wrapper

Jestのコードを変換するのに、全てをtransformerに任せると大変なのと、変換後のコードが既存のコードとあまりにかけ離れた物になっているとデバックが難しくなるため、なるべく元コードの形を維持したまま書き換えるための [wrapper](./src/jest-wrapper.ts) を用意しました。
([こちらを参考にしています。](https://github.com/lukeed/uvu/issues/43#issuecomment-740817223))

具体的には、以下の簡略化した例の通り、describeを置き換えるラッパーです。

```typescript
export function describe (name: string, handler: Handler) {
  const test = suite(name);

  handler({
    test,
    expect, // 別で定義しています
    describe,
    afterAll: test.after,
    beforeAll: test.before,
  });

  test.run();
}
```

Jestのコードを書き換えたイメージは下記の通りです。

```typescript
describe('desc1', ({ afterAll, test, expect, describe }) => {
  afterAll(() => {});
  test('test1', () => {
    expect(parseInt(0.0000005)).not.toBe(0);
  });
  describe('desc2', ({ afterAll, test, expect, describe }) => {
    afterAll(() => {});
    test('test2', () => {
      expect(parseInt(0.0000005)).toBe(5);
    });
  })
});
```

### 3. Jestコードの変換

変換にはTypeScriptのCompilerAPIの中のTransformer機能を利用しました。これは、トランスパイルの途中で入力したTSファイルを修正することができます。2で説明した通り必要な修正はwrapperのdescribeのimport文を追加することと、describeのhandlerに引数を与えることです。

なお、カスタムのTransform pluginはTypeScript(tsconfig.json)では指定できないため、[ttypescript](https://github.com/cevek/ttypescript) を利用します。

## Jestの機能への対応

### Matcher

- expect().toBe()
- expect().toEqual()
- expect().not.toBe()
- expect().not.toEqual()
- expect().rejects.thThrow()
- expect().toMatchSnapshot()

### snapshotテスト

uvuにもsnapshotテストの機能がありますが、既存のjestで作成したスナップショトを生かすため、[jest-snapshot](https://www.npmjs.com/package/jest-snapshot) を利用することでJestのSnapshotテスト機構をそのまま流用しています。

snapshotテストでは実行ファイルのパスを取得する必要があるので、必ずCLIで実行する必要があります。
また、CLIに`-u`フラグを指定することで、jestと同様にsnapshotを更新することができます。

> jest-snapshotは巨大なパッケージで読み込みに数百msを要するため、必要な時にだけ読込まれます。

## Testing Library 対応

`Testing Library`は基本的に`Jest`と併用されることが想定されていますが、[#using-without-jest](https://testing-library.com/docs/react-testing-library/setup/#using-without-jest) を参考に、 `uj` => `node -r global-jsdom/register node_modules/.bin/uj` と置き換えることで利用可能です。

また、`Testing Library`では`toBeInTheDocument`などの独自の custom matcher が提供されていますが、`uvu-jest.config.js` に登録することで、利用可能になります。

```js
module.exports = {
  customMatchers: '@testing-library/jest-dom/matchers',
  /* ... other settnigs */
};
```

## TODO

[readme](./readme.md#TODO) に記載

## FAQ

### TS の path alias を利用する場合

uvu-jest-ts-pluginを利用して生成したjsはTSCでコンパイルした状態なので、TS の path aliasが解決されていません。

そのため、実行時にエイリアスを解決してくれる (module-alias)[https://github.com/ilearnio/module-alias] を利用した設定を、セットアップファイルで読み込みます。

## CONTRIBUTE

PRやissueで要望・感想を頂けると助かります。

## License

MIT © [hedrall](https://blog.hedrall.work)
