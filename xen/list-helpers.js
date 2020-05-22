import { displayType, givenVals } from "./helpers";
import { XenList } from "./types";

/**
 * Takes a function and turns it into a version that applies 
 * it to all elements if the first input is a list.
 */
export function mapList(fn) {
    return function (first, ...args) {
        if (displayType(first) == 'list') {
            return first.map((e) => fn(e, ...args));
        } else if (displayType(args[0]) == 'list') {
            return args[0].map((e) => fn(first, e,));
        } else {
            return fn(first, ...args);
        }
    }
}

/**
 * Takes a function and turns it into a version that applies
 * it to all elements if all inputs are lists
 */
export function elementWise(fn) {
    return function (...args) {
        if (displayType(args[0]) == 'list' && displayType(args[1]) == 'list') {
            let size = args[0].length;
            let result = [];
            for (let j = 0; j < size; j++) {
                let row = [];
                for (let i = 0; i < args.length; i++) {
                    let val = args[i][j];
                    if (typeof val == 'undefined') {
                        throw new RangeError(`Elementwise operations require that all inputs be lists of the same size.
                    ${givenVals(...args)}`);
                    }
                    row.push(val);
                }
                result.push(fn(...row));
            }
            return XenList.from(result);
        } else {
            return fn(...args);
        }
    }
}