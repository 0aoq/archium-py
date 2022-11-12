/**
 * @file Library entry point
 * @name index.ts
 */

// import
import Compile from "./compiler/compile.js";

import path from "node:path";
import fs from "node:fs";

// compile test
Compile(path.resolve(process.cwd(), "ts/compiler/test/test.ts")).then((r) => {
    console.log("Compiled!");
    fs.writeFileSync("ast.json", JSON.stringify(r[1]));
});
