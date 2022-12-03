/**
 * @file Library entry point
 * @name index.ts
 */

// import
import Compile from "./compiler/compile.js";

import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";

import config from "./apyconfig.js";

// create archium folder
if (!fs.existsSync("@archium")) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    fs.mkdirSync("@archium");
    fs.cpSync(path.resolve(__dirname, "pylib"), "@archium/pylib", {
        recursive: true,
    });
}

// compile test
if (config.compilerOptions && config.compilerOptions.entry) {
    console.log(`\u{25FD} \x1b[91;1;4mArchium-PY\x1b[0m
\x1b[93m\u{25FD} v1.0.0\x1b[0m
https://www.oxvs.net/archive/*/@archium/#file:/files/archium-py/outline.md
    
\x1b[92;1m\u{25FD} You'll see debug messages appear below...\x1b[0m\x1b[92m
\u{25FD} Some TypeScript compiler warnings can be ignored! If you know your code is correct, 
   ignore "Cannot find module" warnings.
\u{25FD} Nodes we don't recognize will also be logged, this just means they haven't been
   implemented yet. Feel free to add them yourself!\x1b[0m
${"━".repeat(process.stdout.columns / 2)}`);

    // compile
    Compile([path.resolve(process.cwd(), config.compilerOptions.entry)]).then(
        () => {
            console.log(
                `${"━".repeat(
                    process.stdout.columns / 2
                )}\n\u{25FD} \x1b[92mFinished!\x1b[0m`
            );
        }
    );
} else {
    console.log(
        `[Error] \x1b[93m\u{1F50D} Entry file not specified! Please make sure your project includes an "apyconfig.json" file:
\x1b[90m{
    "compilerOptions": {
        "outDir": "path/to/out/directory",
        "entry": "path/to/entry/file.ts"       
    }
}\x1b[0m`
    );

    process.exit(1);
}
