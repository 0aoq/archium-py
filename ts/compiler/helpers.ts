/**
 * @file Compiler helpers
 * @name helpers.ts
 * @license MIT
 */

import { Node } from "acorn";
import { ArchiumGrammar } from "./compile";

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

/**
 * @function convertTemplateLiteral
 *
 * @export
 * @param {string} content
 * @param {ArchiumGrammar} grammarSettings
 * @returns {string}
 */
export function convertTemplateLiteral(
    content: string,
    grammarSettings: ArchiumGrammar
): string {
    // make the string start with grammarSettings.extra.TemplateLiteral.start
    // make the string end with grammarSettings.extra.TemplateLiteral.end
    // replace ${ with {
    content = `${
        (
            grammarSettings.extra.TemplateLiteral || {
                start: "f'",
            }
        ).start
    }${content
        .slice(0, 1) // remove first
        .slice(0, -1) // remove last
        .replaceAll(
            "\b${",
            (
                grammarSettings.extra.TemplateLiteral || {
                    templateCharacter: {
                        start: "{",
                    },
                }
            ).templateCharacter.start
        )
        .replaceAll(
            "\b}",
            (
                grammarSettings.extra.TemplateLiteral || {
                    templateCharacter: {
                        end: "}",
                    },
                }
            ).templateCharacter.end
        )}
    ${
        (
            grammarSettings.extra.TemplateLiteral || {
                end: "'",
            }
        ).end
    }`;

    // return
    return content;
}

/**
 * @function getBody
 * @description Return the body of an expression that expects a block statement
 *
 * @export
 * @param {any} node
 * @returns {Array<node>}
 */
export function getBody(node: any): Array<Node> {
    // if node.body exists, return if
    // if not, the node is the body
    return node.body !== undefined ? node.body : [node];
}

// default export
export default {
    useSequenceExpression,
    convertTemplateLiteral,
    getBody,
};
