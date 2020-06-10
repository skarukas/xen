import xen from "./constants";

const typeMap = {
    "Number": "number",
    "Boolean": "bool",
    "ETInterval": "et",
    "FreqRatio": "ratio",
    "Cents": "cents",
    "Frequency": "freq",
    "XenList": "list",
    "Array": "list",
    "Symbol": "waveshape",
    "Function": "function"
}

export function isInterval(a) {
    let type = displayType(a);
    return type == "et" || type == "ratio" || type == "cents";
}

export function isNote(a) {
    let type = displayType(a);
    return type == "et" || type == "freq" || type == "cents";
}

/**
 * Determine how to display type names
 */
export function displayType(data) {
    if (data == undefined) return "undefined";
    if (data.partialArgs) return "partial function";
    if (data == xen["..."]) return "hole";

    return (typeMap[data.constructor.name] || "js." + data.constructor.name);
}

/**
 * Check that the arguments of a function are the correct type 
 * before execution.
 */
export function typeCheck(fn, ...types) {
    return function(...args) {
        for (let arg of args) {
            if (! types.includes(displayType(arg))) {
                throw `Type mismatch for ${fn.name}().
                Expect: ${types}
                ${givenVals(...args)}`;
            }
        }
        return fn(...args);
    }
}

export function assertDefined(numArgs, argues) {
    let definedArgs = Array.from(argues).filter((e) => e != undefined);
    if (definedArgs.length < numArgs) {
        throw `Expected ${numArgs} argument(s).
        ${givenVals(...definedArgs)}`;
    }
}

/**
 * 
 * Template for Given: ..., ... (..., ...)
 */
export function givenVals(...args) {
    let result = "Given: ";
    args = args.filter(a => typeof a != 'undefined');
    // value (type)
    result += args.map((a) => `${a} (${displayType(a)})`).join(", ");
    return result;
}