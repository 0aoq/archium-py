/**
 * @file Implementation of the Python random library
 * @name random.ts
 * @see https://docs.python.org/3/library/random.html
 */

/**
 * @function seed
 * @see https://docs.python.org/3/library/random.html#random.seed
 *
 * @export
 * @param {*} a
 * @param {number} version
 */
export function seed(a: any, version: number): void {}

/**
 * @function getstate
 * @see https://docs.python.org/3/library/random.html#random.getstate
 *
 * @export
 * @returns {any}
 */
export function getstate(): any {}

/**
 * @function setstate
 * @see https://docs.python.org/3/library/random.html#random.setstate
 *
 * @export
 * @param {any} state
 * @returns {void}
 */
export function setstate(state: any): void {}

/**
 * @function randbytes
 * @see https://docs.python.org/3/library/random.html#random.randbytes
 *
 * @export
 * @param {number} n
 * @returns {any}
 */
export function randbytes(n: number): any {}

// skipping function randrange (https://docs.python.org/3/library/random.html#random.randrange)
// use random.choice(py.range(x, y, z)) instead

/**
 * @function randint
 * @see https://docs.python.org/3/library/random.html#random.randint
 *
 * @export
 * @param {number} [a]
 * @param {number} [b]
 * @returns {any}
 */
export function randint(a?: number, b?: number): number {
    return 0;
}

// skipping function getrandbits (https://docs.python.org/3/library/random.html#random.getrandbits)

/**
 * @function choice
 * @see https://docs.python.org/3/library/random.html#random.choice
 *
 * @export
 * @param {Array<any>} seq
 * @returns {any}
 */
export function choice(seq: Array<any>): any {}

/**
 * @function choices
 * @see https://docs.python.org/3/library/random.html#random.choices
 *
 * @export
 * @param {Array<any>} population
 * @param {number} k
 * @param {Array<any>} [weights]
 * @param {Array<any>} [cum_weights]
 * @returns {Array<any>}
 */
export function choices(
    population: Array<any>,
    k: number,
    weights?: Array<any>,
    cum_weights?: Array<any>
): Array<any> {
    return [];
}

/**
 * @function shuffle
 * @see https://docs.python.org/3/library/random.html#random.shuffle
 *
 * @export
 * @param {Array<any>} seq
 * @returns {Array<any>}
 */
export function shuffle(seq: Array<any>): Array<any> {
    return [];
}

// skipping function sample (https://docs.python.org/3/library/random.html#random.sample)

/**
 * @function random
 * @see https://docs.python.org/3/library/random.html#random.random
 *
 * @export
 * @returns {number}
 */
export function random(): number {
    return 0;
}

// skipping everything from random.uniform to random.weibullvariate

// default export
export default {
    seed,
    getstate,
    setstate,
    randbytes,
    randint,
    choice,
    choices,
    shuffle,
    random,
};
