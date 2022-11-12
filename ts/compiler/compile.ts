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
 * @returns {Promise<[string, { [key: string]: any }]>}
 */
export default function Compile(
    inputPath: string
): Promise<[string, { [key: string]: any }]> {
    return new Promise((resolve, reject) => {
        let bodyIndentIndex = 0;

        // compile ts
        const results = CompileTypeScript([inputPath], {
            noEmitOnError: true,
            noImplicitAny: true,
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ES2022,
        });

        // store compilation result
        let py = "";

        // parse js
        const js = parse(results[0], {
            sourceType: "module",
            ecmaVersion: "latest",
        });

        function parseBody(body: Node[]): string {
            // for better understanding of an individual node, run the compiler and check "./ast.json" !!!

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
                            (node as any).id.name // <- this is the function name!
                        }(${fd_args}):\n${parseBody((node as any).body.body)}`;
                        bodyIndentIndex--; // all other nodes should get parsed before this line happens...

                        break;

                    case "ReturnStatement":
                        // return statement could be complex, so we'll just grab it from the source
                        res += `${"    ".repeat(
                            bodyIndentIndex
                        )}${results[0].substring(node.start, node.end)}\n\n`;

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

                            case "AssignmentExpression":
                                // grab from original source
                                res += `${"    ".repeat(
                                    bodyIndentIndex
                                )}${results[0]
                                    .substring(expression.start, expression.end)
                                    .replaceAll(
                                        // remove "new" so class reassignment works!
                                        "new ",
                                        ""
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

                        // collect arguments if callee
                        let _var_args = "";

                        if (_var.init.arguments)
                            for (let _vx of _var.init.arguments)
                                _var_args += `${_vx.raw}`;

                        // add to python result
                        res += `${_var.id.name} = ${
                            // raw value OR function/class name
                            _var.init.raw ||
                            `${_var.init.callee.name}(${_var_args})`
                        }\n`;

                        break;

                    // class declaration
                    case "ClassDeclaration":
                        const cd_name = (node as any).id.name;

                        // parse body
                        const cd_body = (node as any).body.body;
                        let cd_indent = "    ".repeat(bodyIndentIndex);

                        bodyIndentIndex++;
                        let cd_dec = {
                            classLine: `${cd_indent}class ${cd_name}`,
                            constructorLine: undefined as any,
                            methods: "",
                        };

                        for (let n of cd_body) {
                            // make sure it is a MethodDefinition, not PropertyDefinition
                            // python doesn't support those...
                            if (n.type !== "MethodDefinition") continue;
                            cd_indent = "    ".repeat(bodyIndentIndex);

                            // handle node kind
                            switch (n.kind) {
                                case "constructor":
                                    bodyIndentIndex++;

                                    // collect arguments
                                    const clc_params = (n.value as any).params;
                                    let clc_args = "";

                                    for (let argument of clc_params)
                                        if (
                                            clc_params.indexOf(argument) !==
                                            clc_params.length - 1
                                        )
                                            clc_args += `${argument.name}, `;
                                        else clc_args += argument.name;

                                    // add to cd_dec
                                    cd_dec.constructorLine = `${cd_indent}def __init__(self, ${clc_args}):\n${parseBody(
                                        n.value.body.body
                                    )}`;

                                    // decrease bodyIndentIndex so things go back to normal!
                                    bodyIndentIndex--;

                                    break;

                                case "method":
                                    bodyIndentIndex++;

                                    // collect arguments
                                    const mtd_params = (n.value as any).params;
                                    let mtd_args = "";

                                    for (let argument of mtd_params)
                                        if (
                                            mtd_params.indexOf(argument) !==
                                            mtd_params.length - 1
                                        )
                                            mtd_args += `${argument.name}, `;
                                        else mtd_args += argument.name;

                                    // add to cd_dec
                                    cd_dec.methods += `${cd_indent}def ${
                                        n.key.name
                                    }(self, ${mtd_args}):\n${parseBody(
                                        n.value.body.body
                                    )}\n\n`;

                                    // decrease bodyIndentIndex so things go back to normal!
                                    bodyIndentIndex--;

                                    break;

                                default:
                                    break;
                            }
                        }

                        res += `${cd_dec.classLine}:\n${cd_dec.constructorLine}\n\n${cd_dec.methods}`;
                        bodyIndentIndex--;

                        break;

                    // import statement
                    case "ImportDeclaration":
                        const imported = (node as any).specifiers; // what are we importing?

                        // import declaration data
                        let imp_dec = {
                            specifiersString: "", // argument like string for imports
                            named: true, // default to named, change to false on ImportNamespaceSpecifier
                        };

                        // gather imports
                        for (let _import of imported) {
                            if (_import.type === "ImportNamespaceSpecifier") {
                                // import all
                                imp_dec.specifiersString = _import.local.name;
                                imp_dec.named = false;
                            } else if (
                                // import named
                                imported.indexOf(_import) !==
                                imported.length - 1
                            )
                                imp_dec.specifiersString += `${_import.imported.name}, `;
                            else
                                imp_dec.specifiersString +=
                                    _import.imported.name;
                        }

                        // add imports
                        if (imp_dec.named)
                            // named
                            res += `from ${(
                                node as any
                            ).source.value.replaceAll("./", "")} import ${
                                imp_dec.specifiersString
                            }\n`;
                        else res += `import ${imp_dec.specifiersString}\n`; // all

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
            .replaceAll("console.log", "print")
            .replaceAll("this", "self");

        // return result
        resolve([py, js]);

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
