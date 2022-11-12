/* import { Blocks, Markdown } from "./gradio";
import py from "pylib";

const block = Blocks();
let demo = null as any;

py.withStatement(block, demo, () => {
    Markdown("Hello, world!");
});

demo.launch(); */

function test() {
    const a = 0;

    if (a === 0) {
        console.log("a is 0!");
    } else if (a === 1) {
        console.log("a is 1!");
    } else {
        console.log("a is unknown!");
    }
}

test();