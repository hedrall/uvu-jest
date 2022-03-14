import transformer from './jest-to-uvu';
import * as fs from 'fs';
import path from 'path';
import * as ts from 'typescript';

const sourceCode = fs.readFileSync(path.resolve(__dirname, 'source.ts')).toString();
const sf = ts.createSourceFile('source.ts', sourceCode, ts.ScriptTarget.ESNext);

const res = ts.transform(sf, [transformer({} as any)], { module: ts.ModuleKind.CommonJS });
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const transformedCode = printer.printNode(ts.EmitHint.Unspecified, res.transformed[0], sf);

fs.writeFileSync(path.resolve(__dirname, 'out.ts'), transformedCode);



