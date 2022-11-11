/**
 * @file Library entry point
 * @name index.ts
 */

// import
import Compile from "./compiler/compile.js";
import path from "node:path";

// compile test
Compile(path.resolve(process.cwd(), "ts/compiler/test/test.ts")).then(() => {
    console.log("Compiled!");
});
