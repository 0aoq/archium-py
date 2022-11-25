/**
 * @file Compiler helpers
 * @name helpers.ts
 * @license MIT
 */

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
 * @return {string}
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

// default export
export default {
    useSequenceExpression,
    convertTemplateLiteral,
};
