/**
 * @file Library entry point
 * @name index.ts
 */

// import
import Compile from "./compiler/compile.js";

import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";

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
Compile(path.resolve(process.cwd(), "ts/compiler/test/test.ts")).then((r) => {
    console.log("Compiled!");
    fs.writeFileSync("ast.json", JSON.stringify(r[1]));
});
