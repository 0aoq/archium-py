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
import config from "../apyconfig.js";

const pylibFunctions = ["withStatement"]; // functions exported by pylib

/**
 * @function Compile
 * @description Compile TypeScript to Python
 *
 * @export
 * @param {string} input
 * @returns {Promise<void>}
 */
export default function Compile(inputPaths: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        let bodyIndentIndex = 0;

        // compile ts
        const results = CompileTypeScript(
            [inputPaths[0]], // <- compile the entry point!
            {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ES2022,
                paths: {
                    pylib: [`${process.cwd()}/@archium/pylib`],
                },
            }
        );

        /**
         * @function __compile
         * @param {string} inputPath
         * @param {any} result
         */
        function __compile(inputPath: string, result: any) {
            // remove py. or pylib.
            result[0] = result[0]
                .replaceAll("py.", "")
                .replaceAll("pylib.", "");

            // store compilation result
            let py = "";

            // parse js
            const js = parse(result[0], {
                sourceType: "module",
                ecmaVersion: "latest",
            });

            function parseBody(body: Node[]): string {
                let res = "";

                // check if body exists, if not we need to stop here!
                if (!body) {
                    // the most common cause for this is trying to parse something doesn't use braces.
                    // TODO: implement the ability to parse something that doesn't use braces
                    // ex:
                    // for (let i = 0; i < 10; i++)
                    //     console.log(i);
                    // ^^ MAKE THAT WORK
                    
                    console.log(
                        "\x1b[91m[ERROR]: Expected body type of Node[], but received undefined!\x1b[0m"
                    );

                    return "";
                }

                // parse body
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
                            }(${fd_args}):\n${parseBody(
                                (node as any).body.body
                            )}`;
                            bodyIndentIndex--; // all other nodes should get parsed before this line happens...

                            break;

                        case "ReturnStatement":
                            // return statement could be complex, so we'll just grab it from the source
                            res += `${"    ".repeat(
                                bodyIndentIndex
                            )}${result[0].substring(node.start, node.end)}\n\n`;

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
                                                expression.arguments[2].body
                                                    .body
                                            )}`;
                                            bodyIndentIndex--;

                                            break;

                                        default:
                                            break;
                                    }

                                    // grab from source and hope it works...
                                    if (pylib) break;
                                    const ce_piece = result[0].substring(
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
                                        (
                                            _expression.arguments[0] || {
                                                start: 0,
                                            }
                                        ).start,
                                        (_expression.arguments[0] || { end: 0 })
                                            .end
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
                                    )}${result[0]
                                        .substring(
                                            expression.start,
                                            expression.end
                                        )
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
                                _var.init.raw = `f${result[0]
                                    .substring(_var.init.start, _var.init.end)
                                    .replaceAll("`", "'")
                                    .replaceAll("${", "{")}`;

                            // handle ArrayExpression
                            if (_var.init.type === "ArrayExpression")
                                _var.init.raw = result[0].substring(
                                    _var.init.start,
                                    _var.init.end
                                );

                            // handle UnaryExpression
                            if (_var.init.type === "UnaryExpression")
                                _var.init.raw = "-" + _var.init.argument.raw;

                            // add to python result
                            res += `${"    ".repeat(bodyIndentIndex)}${
                                _var.id.name
                            } = ${
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
                                        const clc_params = (n.value as any)
                                            .params;
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
                                        const mtd_params = (n.value as any)
                                            .params;
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
                            if ((node as any).source.value.includes("pylib"))
                                break;

                            // import declaration data
                            let imp_dec = {
                                specifiersString: "", // argument like string for imports
                                named: true, // default to named, change to false on ImportNamespaceSpecifier
                                mod: "", // module name
                            };

                            // gather imports
                            for (let _import of imported) {
                                if (
                                    _import.type === "ImportNamespaceSpecifier"
                                ) {
                                    // import all
                                    imp_dec.specifiersString =
                                        _import.local.name;
                                    imp_dec.named = false;
                                    imp_dec.mod = (
                                        node as any
                                    ).source.value.replaceAll("./", "");
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
                            else
                                res += `import ${imp_dec.mod} as ${imp_dec.specifiersString}\n`; // all

                            break;

                        // IfStatement
                        case "IfStatement":
                            // if statement includes 3 parts:
                            //     test: what we are evaluating, we can use substring to get this [1]
                            //     consequent: what happens after, we can use parseBody() on this! [2]
                            //     alternate: may not always be present, could be "else if" or just "else" [3]
                            // the use of parseBody means we need to increment the bodyIndentIndex [4]
                            function if_compute(n: any) {
                                let if_res = "";
                                const if_test = result[0].substring(
                                    // ^ refer to [1]
                                    n.test.start,
                                    n.test.end
                                );

                                bodyIndentIndex++; // <- refer to [3]

                                const if_consequent = parseBody(
                                    // ^ refer to [2]
                                    n.consequent.body
                                );

                                bodyIndentIndex--; // <- refer to [4]

                                // compute alternate
                                // refer to [3]
                                let if_alternate = "";

                                if (n.alternate) {
                                    // if alternate.type === "IfStatement", we need to run if_compute again
                                    // otherwise we'll figure it out it here...
                                    if (n.alternate.type === "IfStatement")
                                        if_alternate += `${"    ".repeat(
                                            bodyIndentIndex
                                        )}el${if_compute(n.alternate)}`;
                                    else {
                                        // ^ haha get it? we're looking at an "else" statement if we're here
                                        const __indent = "    ".repeat(
                                            // ^ initial indent, we've done this before
                                            bodyIndentIndex
                                        );

                                        bodyIndentIndex++; // we're increasing this because we need to do parseBody again!

                                        if_alternate += `${__indent}else:\n${parseBody(
                                            n.alternate.body
                                        )}`;

                                        bodyIndentIndex--;
                                    }
                                }

                                // add to if_res, we're done!
                                if_res += `if ${if_test}:\n${if_consequent}\n${if_alternate}`;

                                return if_res;
                            }

                            // add full stack to res (+indent)
                            res += `${"    ".repeat(
                                bodyIndentIndex
                            )}${if_compute(node)}`;

                            break;

                        // for statements
                        case "ForStatement":
                            // for statement includes 4 parts:
                            //     init: this creates the variable we're incrementing, holds start value [1]
                            //     test: this will hold value we're going to stop at, will be in test.right.raw [2]
                            //     update: how much we're increasing by, if operator = "++" we're increasing by 1 [3]
                            //     body: the code that needs to run every time [4]
                            // the use of parseBody means we need to increment the bodyIndentIndex [5]

                            // get start value, refer to [1]
                            const fs_start_id = (node as any).init
                                .declarations[0].id.name;
                            const fs_start = (node as any).init.declarations[0]
                                .init.raw;

                            // get end value, refer to [2]
                            const fs_end =
                                (node as any).test.right.raw ||
                                "-" + (node as any).test.right.argument.raw; // <- UnaryExpression, negative number

                            // get update value, refer to [3]
                            const fs_update =
                                (node as any).update.operator === "++"
                                    ? "1"
                                    : (node as any).update.operator === "--"
                                    ? "-1"
                                    : (node as any).update.right.raw;

                            // get body, refer to [4] and [5]
                            bodyIndentIndex++;
                            const fs_body = parseBody((node as any).body.body);
                            bodyIndentIndex--;

                            // join and add to res
                            res += `${"    ".repeat(
                                bodyIndentIndex
                            )}for ${fs_start_id} in range(${fs_start}, ${fs_end}, ${fs_update}):\n${fs_body}\n`;

                            break;

                        case "ForInStatement":
                            // for in statement includes 3 parts:
                            //     left: left side of the operation [1]
                            //     right: right side of the operation [2]
                            //     body: the code that needs to run every time [3]
                            // the use of parseBody means we need to increment the bodyIndentIndex [4]

                            // we're basically just declaring a variable in the left side,
                            // so left.declarations[0].id.name works to get that
                            // refer to [1] and [2]
                            const fis_query = `${
                                (node as any).left.declarations[0].id.name
                            } in ${(node as any).right.name}`;

                            // get body
                            // refer to [3]
                            bodyIndentIndex++;
                            const fis_body = parseBody((node as any).body.body);
                            bodyIndentIndex--;

                            // join them and add
                            res += `${"    ".repeat(
                                bodyIndentIndex
                            )}for ${fis_query}:\n${fis_body}\n`;

                            break;

                        default:
                            // log anything we don't understand
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
                .replaceAll("undefined", "None")
                // bad operators
                .replaceAll("===", "==")
                .replaceAll("++", " += 1")
                .replaceAll("--", " -= 1");

            // save file
            const outDir = (config.compilerOptions || { outDir: "@archium/py" })
                .outDir;

            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir); // <- make sure outDir exists
            fs.writeFileSync(
                path.resolve(
                    outDir,
                    path.basename(result[1]).replace(".js", ".py")
                ),
                py
            );
        }

        // start initial compilation
        for (let result in results) {
            // we're doing this in a loop so we can compile all imports too!!!
            __compile(inputPaths[result], results[result]);
        }

        // return
        resolve();
    });
}
