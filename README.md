# archium-py

### **\[?] Implementation Status** https://www.oxvs.net/archive/*/@archium#file:/files/archium-py/outline.md

<br>

Archium-PY is a simple TypeScript to Python transpiler.

Archium-PY uses [Acorn.js](https://npmjs.com/package/acorn) to parse JavaScript into an AST, then it interprets this tree to translate it into the corresponding Python code. Only TypeScript files may be provided, and they will be compiled using the TypeScript compiler API before transpiled into Python.

## Using Python Libraries

Native Python libraries must have an acceptable `.d.ts` file to be used properly. Familiarize yourself with the library API, and then create the TypeScript declaration file.

## Configuration

Archium-PY will automatically look for an `apyconfig.json` file in your current working directory. This file will detail where you want the generated Python files to go, and where your entry file is located.

It should look something like this:

```json
{
    "compilerOptions": {
        "outDir": "@archium/out",
        "entry": "path/to/your/entry/file.ts"
    }
}
```

## Pylib

_Pylib_ is a library of functions and variables that allow you to use common Python keywords and functions from within JavaScript.

It can be imported using the two ways below:

```ts
import pylib from "pylib";
import py from "pylib";
```

A direct path cannot be used, pylib must be imported from `pylib`. Initially running the compiler will generate an @archium/pylib folder. Add the following to your `tsconfig.json` file to make importing from "pylib" work properly:

```json
"paths": {
    "pylib": ["./@archium/pylib"]
}
```

## Links

-   [Outline and implementation status](https://www.oxvs.net/archive/*/@archium#file:/files/archium-py/outline.md)
-   [Pylib Documentation](https://pylib.docs.oxvs.net/variables/default)
-   [Archium-PY Example](https://www.oxvs.net/archive/*/@archium/#file:/files/archium-py/Archium-PY%20Example%201.onb.json)
-   [Forking Archium-PY to compile TypeScript into other languages](https://www.oxvs.net/archive/*/@archium/#file:/files/archium-py/Using%20Archium-PY%20to%20transpile%20TypeScript%20into%20other%20languages.onb.json)
