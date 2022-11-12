/**
 * @file Implement TypeScript compiler
 * @name tsc.ts
 */

import path from "node:path";
import fs from "node:fs";

import ts from "typescript";

/**
 * @function CompileTypeScript
 * @description https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#a-minimal-compiler
 *
 * @export
 * @param {string[]} fileNames
 * @param {ts.CompilerOptions} options
 * @returns {Array<[string, string]>}
 */
export default function CompileTypeScript(
    fileNames: string[],
    options: ts.CompilerOptions
): string[][] {
    options.outDir = "tempts";

    // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#a-minimal-compiler
    let program = ts.createProgram(fileNames, options);
    let emitResult = program.emit();

    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    allDiagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(
                diagnostic.file,
                diagnostic.start!
            );

            let message = ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                "\n"
            );

            console.log(
                `${diagnostic.file.fileName} (${line + 1},${
                    character + 1
                }): ${message}`
            );
        } else {
            console.log(
                ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
            );
        }
    });

    // read result
    let results = [];

    for (let file of fs.readdirSync("tempts")) {
        results.push([
            fs.readFileSync(path.resolve("tempts", file)).toString(),
            path.resolve(file),
        ]);
    }

    // remove tempts
    fs.rmSync("tempts", { recursive: true });

    // return
    return results;
}
