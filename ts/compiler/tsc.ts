/**
 * @file Implement TypeScript compiler
 * @name tsc.ts
 */

import path from "node:path";
import fs from "node:fs";

import ts from "typescript";
import { parse } from "acorn";

/**
 * @function tsc
 * @description A much faster TypeScript compile using transpileModule
 * @see https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#a-simple-transform-function
 *
 * @param {ts.CompilerOptions} options
 * @param {string} _path
 * @returns {Array<[string, string]>}
 */
export function tsc(
    options: ts.CompilerOptions,
    _path: string
): Array<[string, string]> {
    // read file
    if (!fs.existsSync(_path)) {
        console.log("Failed to compile: Entry is not a real file.");
        process.exit(1);
    }

    const js = ts.transpileModule(fs.readFileSync(_path).toString(), {
        compilerOptions: options,
    }).outputText;

    // parse javascript
    const acjs = parse(js, {
        ecmaVersion: "latest",
        sourceType: "module",
    });

    // get imports
    const imports = (acjs as any).body.filter((n: any) => {
        return n.type === "ImportDeclaration";
    });

    // handle imports
    const compilerHost = ts.createCompilerHost(options);
    let modules = [];
    for (let im of imports) {
        let m = ts.resolveModuleName(
            // typescript.d.ts#5030
            im.source.value,
            path.resolve(_path),
            options,
            compilerHost
        );

        // if m does not have a resolvedModule, attempt to resolve failedLookupLocations[0].replace(im.source.value.js, "index")
        if (!m.resolvedModule) {
            const testModuleName2 = (m as any).failedLookupLocations[0].replace(
                im.source.value + ".ts",
                "index.js"
            );

            m = ts.resolveModuleName(
                // typescript.d.ts#5030
                testModuleName2,
                path.resolve(_path),
                options,
                compilerHost
            );

            // if m still does not have a resolvedModule, attempt to resolve dirname/im.source.value/filename
            if (!m.resolvedModule) {
                const testModuleName3 = `${path.dirname(testModuleName2)}/${
                    im.source.value
                }/${path.basename(testModuleName2)}`;

                m = ts.resolveModuleName(
                    // typescript.d.ts#5030
                    testModuleName3,
                    path.resolve(_path),
                    options,
                    compilerHost
                );
            }
        }

        // if it still does not have a resolvedModule, log error
        if (!m.resolvedModule) {
            console.log(
                `[ts.resolveModuleName] \x1b[93m\u{1F50D} Cannot resolve module "${
                    im.source.value
                }"\x1b[0m\n[ts.resolveModuleName] Supplied params:\n[ts.resolveModuleName] \x1b[90m{ moduleName: "${
                    im.source.value
                }", containingFile: "${path.resolve(_path)}", ... }\x1b[0m`
            );

            break;
        }

        // push to modules
        if (m.resolvedModule.resolvedFileName.includes(".js")) continue;
        modules.push(m);
    }

    // make a variable for returnResult, we'll store transpiler results here
    let returnResult: Array<[string, string]> = [];

    // handle base module
    const res = ts.transpileModule(js, {
        compilerOptions: options,
    });

    returnResult.push([res.outputText, _path]);
    console.log(`(Entry ) [Reading] ${_path}`);

    // handle modules
    for (let module of modules) {
        console.log(
            `(Import) [Reading] ${module.resolvedModule!.resolvedFileName}`
        );

        // read file text
        const fileText = fs
            .readFileSync(module.resolvedModule!.resolvedFileName)
            .toString();

        // compile js
        const res = ts.transpileModule(fileText, {
            compilerOptions: options,
        });

        returnResult.push([
            res.outputText,
            module.resolvedModule!.resolvedFileName,
        ]);
    }

    // return
    return returnResult;
}

/**
 * @function CompileTypeScript
 * @description https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#a-minimal-compiler
 *
 * @export
 * @param {string[]} fileNames
 * @param {ts.CompilerOptions} options
 * @returns {Array<[string]>}
 */
export default function CompileTypeScript(
    fileNames: string[],
    options: ts.CompilerOptions
): string[][] {
    options.outDir = "tempts";

    // actual return
    return tsc(options, fileNames[0]).filter((n) => {
        // remove unwanted
        // no .d.ts !!!!
        return !n[1].endsWith(".d.ts");
    });
}
