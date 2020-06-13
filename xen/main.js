/**
 * xen.js - xen language interpreter
 * 
 * Copyright 2020 Stephen Karukas
 * 
 * xen is a high-level, interpreted language for analyzing and operating 
 * upon musical pitch structures within the context of "xenharmonic" 
 * microtonal theory. The interpreter is written in ES6 JavaScript and 
 * based off "AEL" by Peter Olson. xen is heavily reliant on tune.js, a 
 * library which models the xen data types as classes in JavaScript/TypeScript.
 * 
 * 
 * TODO: 
 * - fix line break and semicolon seperate statements. 
 *    bottom of xen-console code should be able to be executed all in one go
 * - play(...) interprets the symbol as an unrecognized waveshape
 * - unary definitions must work like binary defs, maybe have different functions for each
 *    way os using an operator
 * - allow assignment to list indexes
 */


import xen from "./constants";
import "./constants/analysis-functions";
import "./constants/conversion-functions";
import "./constants/math-functions";
import "./constants/playback-functions";
import "./constants/numeric-functions";

import lex from "./xen-lexer";
import parse from "./xen-parser";
import evaluate from "./xen-evaluator";

import "./operators";
import "./macros";

import { givenVals, displayType } from "./helpers";

// make the object's properties immutable
/* Object.freeze(xen); */

function calculate(input) {
    if (! (typeof input == 'string')) throw new TypeError(
        `Xen code must be input as a string.
        ${givenVals(input)}`);
    var tokens = lex(input);
    var parseTree = parse(tokens);
    var output = evaluate(parseTree);
    return output;
};

const external = {
    "evaluate": calculate, 
    "playback": function(freqs) { throw "play() is not supported in this implementation."; },
    "print": function(freqs) { throw "print() is not supported in this implementation."; },
}

xen.print = (...args) => {
    // convert to value/type pairs
    args = args.map(value => ({value, type: displayType(value)}));
    external.print(...args);
}

xen.xen_eval = (str) => {
    let results = external.evaluate(str);
    results = results.filter(e => e != undefined);
    if (results.length) return results[results.length-1].value;
}

// allow JS code to reference and modify the variables object itself
xen.xen_variables = xen;

for (let key in xen) {
    if (xen[key] instanceof Function) {
        xen[key].toString = () => key;
        xen[key].__refuseFunctionalInput = true;
    }
    Object.defineProperty(xen, key,{
        value: xen[key],
        writable: false,
        enumerable: true
    });
}

xen.getIndex.__refuseFunctionalInput = false;
xen.ans = undefined;
xen.__functionsAsData = false;

export default external;