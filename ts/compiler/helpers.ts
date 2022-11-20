/**
 * @file Compiler helpers
 * @name helpers.ts
 * @license MIT
 */

/**
 * @function useSequenceExpression
 *
 * @export
 * @param {any} body
 * @param {(expr: any, i?: number, total?: number) => any} fn
 * @returns  {void}
 */
export function useSequenceExpression(
    body: any,
    fn: (expr: any, i?: number, total?: number) => any
): void {
    // check for sequence expression
    if (body.type && body.type === "SequenceExpression")
        return useSequenceExpression(body.expressions, fn);

    // use normal expression
    if (body.type !== "CallExpression")
        for (let node of body) fn(node, body.indexOf(node), body.length - 1);
    else fn(body, 1, 1); // <- this makes passing a single expression work!
}

// default export
export default {
    useSequenceExpression,
};
