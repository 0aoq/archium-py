/**
 * @file Load apyconfig.json
 * @name apyconfig.ts
 * @license MIT
 */

import fs from "node:fs";

export let config: { [key: string]: any } = {};

// attempt to load config from process.cwd
if (fs.existsSync("apyconfig.json"))
    config = JSON.parse(
        fs.readFileSync("apyconfig.json").toString()
    );

// default export
export default config;
