/**
 * @file JavaScript bindings for Python keywords and functions. The return from these functions does not matter.
 * @name pylib.ts
 * @license MIT
 */

/**
 * @function withStatement
 * @description Create a Python with statement
 *
 * @export
 * @param {*} input with {{input}} as {{output}}
 * @param {*} output with {{input}} as {{output}}
 * @param {() => void} inner Everything inside the with statement
 */
export function withStatement(
    input: any,
    output: any,
    inner: () => void
): void {
    // Hey! The code for this is handled somewhere in compile.ts around line 131
}

/**
 * @function abs
 * @see https://docs.python.org/3/library/functions.html#abs
 *
 * @param {number} x
 * @returns {number}
 */
export const abs = Math.abs;

/**
 * @function aiter
 * @see https://docs.python.org/3/library/functions.html#aiter
 *
 * @param {Iterable<any>} async_iterable
 * @returns {Iterable<any>}
 */
export function aiter(async_iterable: Iterable<any>): Iterable<any> {
    return [];
}

/**
 * @function all
 * @see https://docs.python.org/3/library/functions.html#all
 *
 * @param {Iterable<any>} iterable
 * @returns {boolean}
 */
export function all(iterable: Iterable<any>): boolean {
    return true;
}

/**
 * @function any
 * @see https://docs.python.org/3/library/functions.html#any
 *
 * @param {Iterable<any>} iterable
 * @returns {boolean}
 */
export function any(iterable: Iterable<any>): boolean {
    return true;
}

/**
 * @function ascii
 * @see https://docs.python.org/3/library/functions.html#ascii
 *
 * @param {any} object
 * @returns {string}
 */
export function ascii(object: any): string {
    return "";
}

/**
 * @function bin
 * @see https://docs.python.org/3/library/functions.html#bin
 *
 * @export
 * @param {number} x
 * @returns  {number}
 */
export function bin(x: number): number {
    return 0;
}

/**
 * @function bool
 * @see https://docs.python.org/3/library/functions.html#bool
 *
 * ...skip this
 */

/**
 * @function breakpoint
 * @see https://docs.python.org/3/library/functions.html#breakpoint
 *
 * @returns {void}
 */
export function breakpoint(): void {}

/**
 * @function callable
 * @see https://docs.python.org/3/library/functions.html#callable
 *
 * @param {any} object
 * @returns {boolean}
 */
export function callable(object: any): boolean {
    return true;
}

/**
 * @function chr
 * @see https://docs.python.org/3/library/functions.html#chr
 *
 * @param {number} i
 * @returns {string}
 */
export function chr(i: number): string {
    return "";
}

// NOT IMPLEMENTED: https://docs.python.org/3/library/functions.html#compile
// NOT IMPLEMENTED: https://docs.python.org/3/library/functions.html#delattr
// NOT IMPLEMENTED: https://docs.python.org/3/library/functions.html#dir

/**
 * @function divmod
 * @see https://docs.python.org/3/library/functions.html#divmod
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function divmod(a: number, b: number): number {
    return 0;
}

/**
 * @function enumerate
 * @see https://docs.python.org/3/library/functions.html#enumerate
 *
 * @param {Iterable<any>} iterable
 * @param {number} start
 * @returns {Iterable<any>}
 */
export function enumerate(
    iterable: Iterable<any>,
    start: number
): Iterable<any> {
    return [];
}

/**
 * @function eval
 * @see https://docs.python.org/3/library/functions.html#eval
 *
 * @param {string} expression
 * @returns {number}
 */
export function _eval(expression: string): number {
    return 0;
}

/**
 * @function exec
 * @see https://docs.python.org/3/library/functions.html#exec
 *
 * @param {any} object
 * @returns {any}
 */
export function exec(object: any): any {}

/**
 * @function float
 * @see https://docs.python.org/3/library/functions.html#float
 *
 * @param {string} input
 * @returns {number} float
 */
export function float(input: string): number {
    return 0;
}

// NOT IMPLEMENTED: https://docs.python.org/3/library/functions.html#filter

/**
 * @function format
 * @see https://docs.python.org/3/library/functions.html#format
 *
 * @param {any} value
 * @returns {any}
 */
export function format(value: any): any {}

/**
 * @function int
 * @see https://docs.python.org/3/library/functions.html#int
 *
 * @param {string} input
 * @returns {number} int
 */
export function int(input: string): number {
    return 0;
}

/**
 * @function len
 * @description Return the length of an object
 * @see https://docs.python.org/3/library/functions.html#len
 *
 * @param {any} input
 * @returns {number}
 */
export function len(input: any): number {
    return 0;
}

// ...
export const pylibFunctions = ["withStatement"];

export default {
    withStatement,
    pylibFunctions,

    // https://docs.python.org/3/library/functions.html
    abs,
    aiter,
    all,
    any,
    ascii,
    breakpoint,
    callable,
    chr,
    divmod,
    enumerate,
    eval: _eval,
    _eval,
    exec,
    float,
    format,
    int,
    len,
};
