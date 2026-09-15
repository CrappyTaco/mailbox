// Test-only fallback for Windows sandboxes where tsx cannot query the OS username.
import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const extension of ['.ts', '.tsx']) {
      const url = new URL(specifier + extension, context.parentURL);
      try {
        await access(url);
        return { url: url.href, shortCircuit: true };
      } catch {}
    }
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (/\.(ts|tsx)$/.test(url) && !url.includes('/node_modules/')) {
    const source = await readFile(new URL(url), 'utf8');
    return {
      format: 'module',
      source: ts.transpileModule(source, {
        fileName: new URL(url).pathname,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
