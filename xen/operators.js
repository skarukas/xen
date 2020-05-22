import { infixes, postfixes, prefixes } from "./xen-parser.js";
import xen from "./constants";
// maps operators to their corresponding functions
const operators = {};
export default operators;

/**
 * Add an infix operator which defaults to read-only.
 */
export function addInfixOperator(name, bp, fn, writable = false) {
    Object.defineProperty(infixes, name, {
        value: bp || 4,
        writable: writable,
        enumerable: true
    });
    try {
        Object.defineProperty(operators, name, {
            value: fn,
            writable: writable,
            enumerable: true
        });
    } catch (e) { }
}

/**
 * Add a prefix operator which defaults to read-only.
 */
export function addPrefixOperator(name, bp, fn, writable = false) {
    Object.defineProperty(prefixes, name, {
        value: bp || 6.5,
        writable: writable,
        enumerable: true
    });
    try {
        Object.defineProperty(operators, name, {
            value: fn,
            writable: writable,
            enumerable: true
        });
    } catch (e) { }
}

/**
 * Add an postfix operator which defaults to read-only.
 */
export function addPostfixOperator(name, bp, fn, writable = false) {
    Object.defineProperty(postfixes, name, {
        value: bp || 6.8,
        writable: writable,
        enumerable: true
    });
    try {
        Object.defineProperty(operators, name, {
            value: fn,
            writable: writable,
            enumerable: true
        });
    } catch (e) { }
}

//// Define operators here. One operator may only correspond to one function.
////  e.g. prefix "+" cannot refer to a different function than infix "+"


// interval operators
addInfixOperator(":", 7.5, xen.__colon);
addInfixOperator("#", 7.3, xen.et);
addPrefixOperator("#", 7,  xen.et);
addPrefixOperator(":", 7,  xen.__colon);
//unary operators
addPrefixOperator("-", 6.5, xen.subtract);
addPrefixOperator("+", 6.5, xen.add);
addPrefixOperator("!", 6.5, (a) => !a);
// postfix
addPostfixOperator("c", 6.8, xen.cents);
addPostfixOperator("hz", 6.8, xen.freq);

addInfixOperator("^", 6, xen.pow);
addInfixOperator("*", 4, xen.multiply);
addInfixOperator("/", 4, xen.divide);
addInfixOperator("%", 4, xen.mod);
addInfixOperator("+", 3, xen.add);
addInfixOperator("-", 3, xen.subtract);

addInfixOperator(">", 2.80, xen.greaterThan);
addInfixOperator("<", 2.80, xen.lessThan);
addInfixOperator(">=", 2.80, (a, b) => xen.greaterThan(a, b) || xen.equal(a, b));
addInfixOperator("<=", 2.80, (a, b) => xen.lessThan(a, b) || xen.equal(a, b));

addInfixOperator("==", 2.70, xen.equal);
addInfixOperator("!=", 2.70, (a, b) => !xen.equal(a, b));
addInfixOperator("&&", 2.65, (a, b) => a && b);
addInfixOperator("||", 2.60, (a, b) => a || b);

addPostfixOperator(";", 0.5, xen.__null);