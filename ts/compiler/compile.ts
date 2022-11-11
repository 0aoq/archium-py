/**
 * @file Main compiler
 * @name compile.ts
 * @license MIT
 */

import path from "node:path";
import fs from "node:fs";

import { Node, parse } from "acorn";
import ts from "typescript";

import CompileTypeScript from "./tsc.js";

/**
 * @function Compile
 * @description Compile TypeScript to Python
 *
 * @export
 * @param {string} input
 * @returns {string}
 */
export default function Compile(inputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let bodyIndentIndex = 0;

        // compile ts
        const results = CompileTypeScript([inputPath], {
            noEmitOnError: true,
            noImplicitAny: true,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.CommonJS,
        });

        // store compilation result
        let py = "";

        // parse js
        const js = parse(results[0], {
            sourceType: "module",
            ecmaVersion: "latest",
        });

        function parseBody(body: Node[]): string {
            let res = "";

            for (let node of body) {
                // handle different types
                switch (node.type) {
                    // functions
                    case "BlockStatement":
                        // parse block body
                        res += parseBody((node as any).body);
                        break;

                    case "FunctionDeclaration":
                        // collect arguments
                        const fd_params = (node as any).params;
                        let fd_args = "";

                        for (let argument of fd_params)
                            if (
                                fd_params.indexOf(argument) !==
                                fd_params.length - 1
                            )
                                fd_args += `${argument.name}, `;
                            else fd_args += argument.name;

                        // parse function and return python function
                        const __indent = "    ".repeat(bodyIndentIndex); // initial indent

                        bodyIndentIndex++; // increase index so function is indented properly
                        res += `${__indent}def ${
                            (node as any).id.name
                        }(${fd_args}):\n${parseBody((node as any).body.body)}`;

                        break;

                    case "ReturnStatement":
                        // return statement could be complex, so we'll just grab it from the source
                        res += `${"    ".repeat(
                            bodyIndentIndex
                        )}${results[0].substring(node.start, node.end)}\n\n`;
                        bodyIndentIndex--;

                        break;

                    // call/expression
                    case "ExpressionStatement":
                        // handle expression types
                        const expression = (node as any).expression;
                        switch (expression.type) {
                            case "CallExpression":
                                // grab from source and hope it works...
                                res += `${"    ".repeat(
                                    bodyIndentIndex
                                )}${results[0].substring(
                                    expression.start,
                                    expression.end
                                )}\n`;

                                break;

                            default:
                                break;
                        }

                        break;

                    // variable declaration
                    case "VariableDeclaration":
                        // get declaration
                        const _var = (node as any).declarations[0];

                        // add to python result
                        res += `${_var.id.name} = ${_var.init.raw}\n`;

                        break;

                    default:
                        console.log(node);
                        break;
                }
            }

            return res;
        }

        py += parseBody((js as any).body)
            // booleans
            .replaceAll("true", "True")
            .replaceAll("false", "False")
            // functions
            .replaceAll("console.log", "print");

        // return result
        resolve(py);

        // save file
        fs.writeFileSync(
            path.resolve(
                path.dirname(inputPath),
                path.basename(inputPath).replace(".ts", ".py")
            ),
            py
        );
    });
}
