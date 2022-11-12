/**
 * @file Main compiler
 * @name compile.ts
 * @license MIT
 */

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

import { Node, parse } from "acorn";
import ts from "typescript";

import CompileTypeScript from "./tsc.js";

const pylibFunctions = ["withStatement"]; // functions exported by pylib

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
        fs.mkdirSync("@archium/tempjs"); // create temp javascript store

        const fID = crypto.randomUUID();
        fs.writeFileSync(
            // clone file but replace pylib imports
            `@archium/tempjs/temp-${fID}.ts`,
            fs
                .readFileSync(inputPath)
                .toString()
                .replaceAll('import py from "pylib"', "")
                .replaceAll('import pylib from "pylib"', "")
                .replaceAll("py.", "")
                .replaceAll(".pylib", "")
        );

        const results = CompileTypeScript(
            [path.resolve("@archium/tempjs", `temp-${fID}.ts`)], // <- compile this temp file!
            {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ES2022,
            }
        );

        fs.rmSync("@archium/tempjs", { recursive: true }); // <- remove tempjs folder!

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
                                // if calling a pylib function, parse into something else
                                let pylib = false;
                                if (
                                    expression.callee &&
                                    expression.callee.name &&
                                    pylibFunctions.includes(
                                        expression.callee.name
                                    )
                                )
                                    // handle functions
                                    pylib = true;
                                switch (expression.callee.name) {
                                    case "withStatement":
                                        const __indent = "    ".repeat(
                                            bodyIndentIndex
                                        );

                                        // first param: input variable
                                        // second param: output variable
                                        // third param: callback function, parse this!
                                        bodyIndentIndex++;
                                        res += `${__indent}with ${
                                            expression.arguments[0].name
                                        } as ${
                                            expression.arguments[1].name
                                        }:\n${parseBody(
                                            expression.arguments[2].body.body
                                        )}`;
                                        bodyIndentIndex--;

                                        break;

                                    default:
                                        break;
                                }

                                // grab from source and hope it works...
                                if (pylib) break;
                                const ce_piece = results[0].substring(
                                    // <- get the stuff we're working on
                                    expression.start,
                                    expression.end
                                );

                                const ce_tree = parse(ce_piece, {
                                    // ^ parse this call expression individually
                                    ecmaVersion: "latest",
                                });

                                const _expression = (ce_tree as any).body[0] // <- store the expression
                                    .expression;

                                const ce_func = ce_piece.substring(
                                    // ^ get the function we're calling
                                    // we're doing substring from the entire line we're working on,
                                    // _expression.callee holds the start and end of the function
                                    // call string, we need that!
                                    _expression.callee.start,
                                    _expression.callee.end
                                );

                                let ce_content = ce_piece.substring(
                                    // ^ create content variable
                                    (_expression.arguments[0] || { start: 0 })
                                        .start,
                                    (_expression.arguments[0] || { end: 0 }).end
                                    // we did (v || 0) for both because that would make the value empty!!!
                                );

                                // if the content starts with `, handle the TemplateLiteral
                                if (ce_content.startsWith("`"))
                                    // make the string start with f'
                                    // replace ` with '
                                    // replace ${ with {
                                    ce_content = `f${ce_content
                                        .replaceAll("`", "'")
                                        .replaceAll("${", "{")}`;

                                // add to res
                                res += `${"    ".repeat(
                                    bodyIndentIndex
                                )}${ce_func}(${ce_content})\n`; // <- join ce_func and ce_content

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
                        let _var_args: string | undefined = "";

                        if (_var.init)
                            if (_var.init.arguments)
                                for (let _vx of _var.init.arguments)
                                    _var_args += `${_vx.raw}`;
                            else undefined;
                        else _var_args = undefined;

                        // handle TemplateLiteral
                        if (_var.init.type === "TemplateLiteral")
                            // use substring to get the piece of code
                            // make the string start with f'
                            // replace ` with '
                            // replace ${ with {
                            _var.init.raw = `f${results[0]
                                .substring(_var.init.start, _var.init.end)
                                .replaceAll("`", "'")
                                .replaceAll("${", "{")}`;

                        // add to python result
                        res += `${_var.id.name} = ${
                            // raw value OR function/class name
                            (_var.init || { raw: "None" }).raw ||
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

                        // ignore pylib imports
                        if ((node as any).source.value.includes("pylib")) break;

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
            .replaceAll("this", "self")
            // null
            .replaceAll("null", "None")
            .replaceAll("undefined", "None");

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
