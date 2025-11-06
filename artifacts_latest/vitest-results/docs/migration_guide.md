# Migration guide (Pine -> Star)

Steps to migrate a Pine indicator to Star (Phase0->Phase4 MVP):

1. Run the transpiler to get initial Star code:

```powershell
npm run transpile -- --in myscript.pine --out-star myscript.star
```

2. Inspect the generated Star source and run it with the runner to validate outputs:

```ts
import runner from './src/lib/star-runtime/runner';
const res = runner.runScript(fs.readFileSync('myscript.star','utf8'));
```

3. Adjust named args and call conventions as necessary. Use tests in `tests/transformer` as examples.

