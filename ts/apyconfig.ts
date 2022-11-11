/**
 * @file Load apyconfig.json
 * @name apyconfig.ts
 * @license MIT
 */

import fs from "node:fs";

export let config = {};

// attempt to load config from process.cwd
if (fs.existsSync(`${process.cwd}/apyconfig.json`))
    config = JSON.parse(
        fs.readFileSync(`${process.cwd}/apyconfig.json`).toString()
    );

// default export
export default config;
