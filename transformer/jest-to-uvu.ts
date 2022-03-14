import * as ts from 'typescript';
import kleur from 'kleur';

const FILE = kleur.bold().underline().white;
const uvuPackageName = 'uvu-jest';
const thisPackageName = 'uvu-jest-ts-plugin';

const describeParams = ts.factory.createParameterDeclaration(
  undefined,
  undefined,
  undefined,
  ts.factory.createObjectBindingPattern([
    ts.factory.createBindingElement(
      undefined,
      undefined,
      ts.factory.createIdentifier("beforeAll"),
      undefined
    ),
    ts.factory.createBindingElement(
      undefined,
      undefined,
      ts.factory.createIdentifier("afterAll"),
      undefined
    ),
    ts.factory.createBindingElement(
      undefined,
      undefined,
      ts.factory.createIdentifier("describe"),
      undefined
    ),
    ts.factory.createBindingElement(
      undefined,
      undefined,
      ts.factory.createIdentifier("test"),
      undefined
    ),
    ts.factory.createBindingElement(
      undefined,
      undefined,
      ts.factory.createIdentifier("expect"),
      undefined
    )
  ]),
  undefined,
  undefined,
  undefined
);

const createUvuImport = () => {
  const importUvuJestWrapper = ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([ts.factory.createImportSpecifier(
        false,
        undefined,
        ts.factory.createIdentifier("describe")
      )])
    ),
    ts.factory.createStringLiteral(`${uvuPackageName}/jest-wrapper`),
    undefined
  );
  const generatedIdentifier = ts.factory.getGeneratedNameForNode(importUvuJestWrapper);
  return {
    importUvuJestWrapper,
    generatedIdentifier: generatedIdentifier,
  };
};

const transformerFactory: ts.TransformerFactory<ts.SourceFile> = context => {
  /**
   * Since transform is executed after checking the dependencies in the binder,
   * the additional imported description will not match the identifier of the original description.
   * Therefore, the generated identifiers should be used to explicitly link the two.
   *
   * transformはbinderで依存関係をチェックした後に実行されるため、
   * 追加でimportしたdescribeと元々技術されていたdescribeのidentifierが一致しなくなる。
   * そのため、生成されたidentifierを利用して明示的に両者を紐づける。
   */
  let describeImportIdentifier: null | ts.Identifier = null;
  let sf: ts.SourceFile;
  const childVisitor = (describeDepth: number = 1, forDebug: string = '') => {
    return (node: ts.Node): ts.VisitResult<ts.Node> => {
      /**
       * fix describe node
       * from: describe('suite name', () => { ... })
       * to:   describe('suite name', ({ beforeAll, afterAll, describe, test, expect }) => { ... })
       */
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression)) {
          if (node.expression.text === 'describe') {
            // is describe call

            const [, testHandler] = node.arguments;
            let updatedHandler!: ts.ArrowFunction | ts.FunctionExpression;
            if (ts.isArrowFunction(testHandler)) {
              updatedHandler = ts.factory.updateArrowFunction(
                testHandler,
                testHandler.modifiers,
                testHandler.typeParameters,
                [describeParams], //testHandler.parameters,
                testHandler.type,
                testHandler.equalsGreaterThanToken,
                ts.visitEachChild(testHandler.body, childVisitor(describeDepth + 1), context),
              );
            } else if (ts.isFunctionExpression(testHandler)) {
              updatedHandler = ts.factory.updateFunctionExpression(
                testHandler,
                testHandler.modifiers,
                testHandler.asteriskToken,
                testHandler.name,
                testHandler.typeParameters,
                [describeParams],
                testHandler.type,
                ts.visitEachChild(testHandler.body, childVisitor(describeDepth + 1), context),
              )
            } else {
              throw new Error('unexpected test handler');
            }

            return ts.factory.updateCallExpression(
              node,
              describeDepth === 1 ? (
                ts.factory.createPropertyAccessExpression(
                  describeImportIdentifier as ts.Identifier,
                  ts.factory.createIdentifier('describe')
                )
              ) : node.expression,
              node.typeArguments,
              [node.arguments[0], updatedHandler]
            );
          }
        }
      }
      return ts.visitEachChild(node, childVisitor(describeDepth), context);
    }
  };

  const visitor = (rootNode: ts.Node): ts.Node => {
    // return rootNode;
    if (!ts.isSourceFile(rootNode)) {
      console.warn('not source file', (rootNode as ts.SourceFile).fileName );
      return rootNode;
    }
    return ts.visitEachChild(rootNode, childVisitor(1, 'bbbbbb'), context);
  };

  return sf => {
    const isSpecFile = /.*\.spec.(ts|js|tsx)$/.test( sf.fileName );
    if (!isSpecFile) {
      console.log(kleur.dim('not spec file'), kleur.dim(sf.fileName));
      return sf;
    }

    console.log(kleur.bgGreen(`[${thisPackageName}: process]:`), FILE(sf.fileName));

    const { importUvuJestWrapper, generatedIdentifier } = createUvuImport()
    describeImportIdentifier = generatedIdentifier;
    const sf1 = ts.visitNode(sf, visitor);
    return ts.factory.updateSourceFile(
      sf1,
      [importUvuJestWrapper, ...sf1.statements],
    );
  };
};

export default (program: ts.Program, config?: any) => {
  return transformerFactory;
}

// export default transformerFactory;
