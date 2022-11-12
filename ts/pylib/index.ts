/**
 * @file JavaScript bindings for Python keywords
 * @name pylib.ts
 * @license MIT
 */

export function withStatement(
    input: any,
    output: any,
    inner: () => void
): void {
    // Hey! The code for this is handled somewhere in compile.ts around line 131
}

export const pylibFunctions = ["withStatement"];

export default {
    withStatement,
    pylibFunctions,
};
