import path from 'path';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const gen = req(path.resolve(process.cwd(), 'src/lib/star-parser/parser.cjs'));
const parse = gen.parse || (gen.default && gen.default.parse);

const samples = [
  `a = "He said hello"\n`,
  `a = 123.456\n`,
  `a = func ( arg1 , arg2 )\n`,
  `a = close[12]\n`,
  `a = [1, 2, 3]\n`,
  `a = sma(close, 14)\n`,
  `a = request.security(syminfo.tickerid, 'D', close)\n`,
  `a = [1,2,3]\n`,
  `a = "hello world"\n`,
];

for (const s of samples) {
  try {
    const r = parse(s);
    console.log('OK:', s.trim(), '->', JSON.stringify(r));
  } catch (e) {
    console.error('ERR:', s.trim(), e && e.message);
  }
}
