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

import helpers, { useSequenceExpression } from "./helpers.js";

const pylibFunctions = ["withStatement", "named", "nv"]; // functions exported by pylib

/** @type ArchiumGrammar */
export type ArchiumGrammar = {
    func: {
        kwd: string;
    };
    var: {
        kwd: string;
    };
    class: {
        kwd: string;
        constructorName: string;
        doPrefixWithSelf?: boolean; // <- defualt: true, should we prefix methods with "self" ?
        doPrefixMethods?: boolean; // <- defualt: true, should we prefix methods with the function kwd?
        constructorIsAFunction?: boolean; // <- default: true, should we prefix the constructor with the function kwd?
        callWithNew?: boolean; // <- default: false
    };
    extra: {
        TemplateLiteral?: {
            start: string;
            end: string;
            templateCharacter: {
                start: string;
                end: string;
            };
        };
    };
    file: {
        ext: string;
        doAddSemicolon?: boolean; // <- default: false
        doAddBraces?: boolean; // <- default: false
        stdlib: {
            import: string; // <- default: pylib
            path: string; // <- default: @archium/pylib
            possibleNames: string[]; // <- default: ["py", "pylib"]
        };
        requiredReplacements: {
            // booleans
            true: string; // <- default: True
            false: string; // <- default: False
            // functions
            "console.log": string; // <- default: print
            this: string; // <- default: self
            // null
            null: string; // <- default: "None"
            undefined: string; // <- default: "None"
            // bad operators
            "===": string; // <- default: ==
            "++": string; // <- default: += 1
            "--": string; // <- default: -= 1
        };
    };
};

/**
 * @function Compile
 * @description Compile TypeScript to [language]
 *
 * @export
 * @param {string} input
 * @returns {Promise<void>}
 */
export default function Compile(inputPaths: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        // get settings from config.compilerOptions.grammar
        let grammarSettings: ArchiumGrammar = config.compilerOptions
            .grammar || {
            // python grammar
            func: {
                kwd: "def",
            },
            var: {
                kwd: "",
            },
            class: {
                kwd: "class",
                constructorName: "__init__",
                doPrefixWithSelf: true,
                doPrefixMethods: true,
                constructorIsAFunction: true,
                callWithNew: false,
            },
            extra: {
                TemplateLiteral: {
                    start: "f'",
                    end: "'",
                    templateCharacter: {
                        start: "{",
                        end: "}",
                    },
                },
            },
            file: {
                ext: "py",
                doAddSemicolon: false,
                doAddBraces: false,
                stdlib: {
                    import: "pylib",
                    path: "@archium/pylib",
                    possibleNames: ["py", "pylib"],
                },
                requiredReplacements: {
                    // booleans
                    true: "True",
                    false: "False",
                    // functions
                    "console.log": "print",
                    this: "self",
                    // null
                    null: "None",
                    undefined: "None",
                    // bad operators
                    "===": "==",
                    "++": " += 1",
                    "--": " -= 1",
                },
            },
        };

        console.log(
            "(In Use) ArchiumGrammar: " + JSON.stringify(grammarSettings)
        );

        // these grammar settings will be used to customize the language archium-py compiles into

        // ...
        let bodyIndentIndex = 0;

        // compile ts
        const results = CompileTypeScript(
            [inputPaths[0]], // <- compile the entry point!
            {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ES2022,
                baseUrl: process.cwd(),
                paths: {
                    [grammarSettings.file.stdlib.import]: [
                        grammarSettings.file.stdlib.path,
                    ],
                },
            }
        );

        /**
         * @function __compile
         * @param {string} inputPath
         * @param {any} result
         */
        function __compile(inputPath: string, result: any) {
            // remove [stdlib]
            // example: remove py. or pylib. (input: ["py", "pylib"])
            for (let pn of grammarSettings.file.stdlib.possibleNames)
                result[0] = result[0].replaceAll(`${pn}.`, "");

            // store compilation result
            let langRes = "";

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

                // semicolon
                let semi =
                    grammarSettings.file.doAddSemicolon === true ? ";" : "";

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

                            // parse function and return [language] function
                            const __indent = "    ".repeat(bodyIndentIndex); // initial indent

                            bodyIndentIndex++; // increase index so function is indented properly

                            res += `${__indent}${grammarSettings.func.kwd} ${
                                (node as any).id.name // <- this is the function name!
                            }(${fd_args})${
                                // handle braces
                                grammarSettings.file.doAddBraces === true
                                    ? " {"
                                    : ":"
                            }\n${parseBody((node as any).body.body)}${
                                // handle braces
                                grammarSettings.file.doAddBraces === true
                                    ? "}\n\n"
                                    : ""
                            }`;

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
                                        // ^ get the stuff we're working on
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

                                    let ce_content = ce_piece
                                        .substring(
                                            // ^ create content variable
                                            (
                                                _expression || {
                                                    start: 0,
                                                }
                                            ).start,
                                            (_expression || { end: 0 }).end
                                            // we did (v || 0) for both because that would make the value empty!!!
                                        )
                                        .split(`${ce_func}(`)[1] // <- get after function
                                        .slice(0, -1); // <- remove close function paren

                                    // attempt to parse the named variables thing below...
                                    if (
                                        ce_content.includes("nv") ||
                                        ce_content.includes("named")
                                    ) {
                                        // if we're here, we know we're parsing a named variable.
                                        const con_js = parse(ce_content, {
                                            ecmaVersion: "latest",
                                        });

                                        /* RETURN EXAMPLE:
                                            Node {
                                                type: 'Program',
                                                start: 0,
                                                end: 17,
                                                body: [
                                                    Node {
                                                        type: 'ExpressionStatement',
                                                        start: 0,
                                                        end: 17,
                                                        expression: [Node] <- con_expr
                                                    }
                                                ],
                                                sourceType: 'script'
                                            }
                                        */

                                        // use useSequenceExpression to parse
                                        let t_ce_content = ""; // <- we're going to store the temp ce_content here!

                                        useSequenceExpression(
                                            (con_js as any).body[0].expression,
                                            (con_expr, i, total) => {
                                                // con_expr = root.body[0].expression

                                                // right now, we're only going to implement literal types
                                                // maybe add the others later?
                                                if (
                                                    con_expr.arguments[0]
                                                        .type !== "Literal" &&
                                                    con_expr.arguments[1]
                                                        .type !== "Literal"
                                                )
                                                    return "";

                                                // aaaaand finish:
                                                t_ce_content +=
                                                    // set it to the named variable
                                                    `${
                                                        con_expr.arguments[0]
                                                            .value
                                                    }=${
                                                        con_expr.arguments[1]
                                                            .raw
                                                    }${
                                                        // only add ", " if this is the last argument
                                                        i === total ? "" : ", "
                                                    }`;
                                            }
                                        );

                                        ce_content = t_ce_content; // set ce_content to temp_ce_content
                                        // sooo this current configuration doesn't preserve arguments that
                                        // aren't an expression... might need to be fixed later!
                                    }

                                    // if the content starts with `, handle the TemplateLiteral
                                    if (ce_content.startsWith("`"))
                                        ce_content =
                                            helpers.convertTemplateLiteral(
                                                ce_content,
                                                grammarSettings
                                            );

                                    // add to res
                                    res += `${"    ".repeat(
                                        bodyIndentIndex
                                    )}${ce_func}(${ce_content})${semi}\n`; // <- join ce_func and ce_content

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
                                        )}${semi}\n`;

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
                                        _var.init.arguments.indexOf(_vx) !==
                                        _var.init.arguments.length - 1
                                            ? (_var_args += `${_vx.raw}, `) // <- not at end
                                            : (_var_args += `${_vx.raw}`);
                                // <- at end
                                else undefined;
                            else _var_args = undefined;

                            // handle TemplateLiteral
                            if (_var.init.type === "TemplateLiteral")
                                _var.init.raw = helpers.convertTemplateLiteral(
                                    _var.init.raw,
                                    grammarSettings
                                );

                            // handle ArrayExpression
                            if (_var.init.type === "ArrayExpression")
                                _var.init.raw = result[0].substring(
                                    _var.init.start,
                                    _var.init.end
                                );

                            // handle UnaryExpression
                            if (_var.init.type === "UnaryExpression")
                                _var.init.raw = "-" + _var.init.argument.raw;

                            // handle ObjectExpression
                            if (_var.init.type === "ObjectExpression")
                                _var.init.raw = result[0].substring(
                                    _var.init.start,
                                    _var.init.end
                                );

                            // handle CallExpression
                            if (_var.init.type === "CallExpression")
                                _var.init.raw = result[0].substring(
                                    _var.init.start,
                                    _var.init.end
                                );

                            // add to [language] result
                            res += `${"    ".repeat(bodyIndentIndex)}${
                                grammarSettings.var.kwd !== ""
                                    ? `${grammarSettings.var.kwd} ` // <- add a space to the keyword IF it isn't blank
                                    : ""
                            }${_var.id.name} = ${
                                // ^ _var.id.name is the name of the variable! (it's right above this)
                                _var.init.type !== "BinaryExpression" // <- binary expression is a little harder
                                    ? // raw value OR function/class name
                                      (_var.init || { raw: "None" }).raw ||
                                      `${
                                          // add "new" if it was there originally
                                          grammarSettings.class.callWithNew
                                              ? result[0]
                                                    .substring(
                                                        _var.init.start,
                                                        _var.init.end
                                                    )
                                                    .includes("new")
                                                  ? "new "
                                                  : ""
                                              : "" // <- do nothing
                                      }${_var.init.callee.name}(${_var_args})`
                                    : // harder so we're just going to use substring :)
                                      result[0].substring(
                                          _var.init.start,
                                          _var.init.end
                                      )
                            }${semi}\n`;

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
                                // [language] probably doesn't support those...
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
                                        cd_dec.constructorLine = `${cd_indent}${
                                            // handle constructorIsAFunction
                                            grammarSettings.class
                                                .constructorIsAFunction === true
                                                ? `${grammarSettings.func.kwd} `
                                                : ""
                                        }${
                                            grammarSettings.class
                                                .constructorName
                                        }(${
                                            // handle doPrefixWithSelf
                                            grammarSettings.class
                                                .doPrefixWithSelf === true
                                                ? "self, "
                                                : ""
                                        }${clc_args})${
                                            // handle braces
                                            grammarSettings.file.doAddBraces ===
                                            true
                                                ? " {"
                                                : ":"
                                        }\n${parseBody(n.value.body.body)}${
                                            // handle braces
                                            grammarSettings.file.doAddBraces ===
                                            true
                                                ? `${cd_indent}}\n\n`
                                                : ""
                                        }`;

                                        // decrease bodyIndentIndex so things go back to normal!
                                        bodyIndentIndex--;

                                        break;

                                    case "method":
                                        bodyIndentIndex++;

                                        // collect arguments
                                        const mtd_params = (n.value as any) // <- method_params
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
                                        cd_dec.methods += `${cd_indent}${
                                            // handle doPrefixMethods
                                            grammarSettings.class
                                                .doPrefixMethods === true
                                                ? `${grammarSettings.func.kwd} `
                                                : ""
                                        }${n.key.name}(${
                                            // handle doPrefixWithSelf
                                            grammarSettings.class
                                                .doPrefixWithSelf === true
                                                ? "self, "
                                                : ""
                                        }${mtd_args})${
                                            // handle braces
                                            grammarSettings.file.doAddBraces ===
                                            true
                                                ? " {"
                                                : ":"
                                        }\n${parseBody(n.value.body.body)}${
                                            // handle braces
                                            grammarSettings.file.doAddBraces ===
                                            true
                                                ? `${cd_indent}}\n\n`
                                                : ""
                                        }\n\n`;

                                        // decrease bodyIndentIndex so things go back to normal!
                                        bodyIndentIndex--;

                                        break;

                                    default:
                                        break;
                                }
                            }

                            res += `${cd_dec.classLine}${
                                // handle braces
                                grammarSettings.file.doAddBraces === true
                                    ? " {"
                                    : ":"
                            }\n${cd_dec.constructorLine}\n\n${cd_dec.methods}${
                                // handle braces
                                grammarSettings.file.doAddBraces === true
                                    ? "}\n\n"
                                    : ""
                            }`;
                            bodyIndentIndex--;

                            break;

                        // import statement
                        case "ImportDeclaration":
                            const imported = (node as any).specifiers; // what are we importing?

                            // ignore [stdlib] imports
                            if (
                                (node as any).source.value.includes(
                                    grammarSettings.file.stdlib.import
                                )
                            )
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
                            // TODO: make this customizable in ArchiumGrammar
                            if (imp_dec.named)
                                // named
                                res += `from ${(
                                    node as any
                                ).source.value.replaceAll("./", "")} import ${
                                    imp_dec.specifiersString
                                }${semi}\n`;
                            else
                                res += `import ${imp_dec.mod} as ${imp_dec.specifiersString}${semi}\n`; // all

                            break;

                        // IfStatement
                        case "IfStatement":
                            // if statement includes 3 parts:
                            //     test: what we are evaluating, we can use substring to get this [1]
                            //     consequent: what happens after, we can use parseBody() on this! [2]
                            //     alternate: may not always be present, could be "else if" or just "else" [3]
                            // the use of parseBody means we need to increment the bodyIndentIndex [4]

                            // TODO: make this customizable in ArchiumGrammar
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

                            // TODO: make this customizable in ArchiumGrammar

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

                            // TODO: make this customizable in ArchiumGrammar

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

            langRes += parseBody((js as any).body)
                // booleans
                .replaceAll(
                    "true",
                    grammarSettings.file.requiredReplacements.true
                )
                .replaceAll(
                    "false",
                    grammarSettings.file.requiredReplacements.false
                )
                // functions
                .replaceAll(
                    "console.log",
                    grammarSettings.file.requiredReplacements["console.log"]
                )
                .replaceAll(
                    "this",
                    grammarSettings.file.requiredReplacements.this
                )
                // null
                .replaceAll(
                    "null",
                    grammarSettings.file.requiredReplacements.null
                )
                .replaceAll(
                    "undefined",
                    grammarSettings.file.requiredReplacements.undefined
                )
                // bad operators
                .replaceAll(
                    "===",
                    grammarSettings.file.requiredReplacements["==="]
                )
                .replaceAll(
                    "++",
                    grammarSettings.file.requiredReplacements["++"]
                )
                .replaceAll(
                    "--",
                    grammarSettings.file.requiredReplacements["--"]
                );

            // save file
            const outDir = (
                config.compilerOptions || {
                    outDir: `@archium/${grammarSettings.file.ext}`,
                }
            ).outDir;

            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir); // <- make sure outDir exists
            fs.writeFileSync(
                path.resolve(
                    outDir,
                    path
                        .basename(result[1])
                        .replace(".js", `.${grammarSettings.file.ext}`)
                ),
                langRes
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
