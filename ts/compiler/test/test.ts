import { Blocks, Markdown } from "./gradio";
import py from "pylib";

const block = Blocks();
let demo = null as any;

py.withStatement(block, demo, () => {
    Markdown("Hello, world!");
});

demo.launch();
