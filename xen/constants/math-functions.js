import { assertDefined, givenVals, displayType, isInterval, isNote } from "../helpers";
import { mapList, elementWise } from "../list-helpers";
import xen from "../constants";

xen.add = elementWise(mapList(function(a, b) {
    assertDefined(1, arguments);

    try {
        if (a == undefined) return xen.number(b);

        if (typeof a == "number" && typeof b == "number") return a + b;
        if (displayType(b) == "freq"  && isInterval(a)) return b.noteAbove(a);
        if (displayType(a) == "freq"  && isInterval(b)) return a.noteAbove(b);
        if (displayType(a) == "freq"  && displayType(b) == "freq") return tune.Frequency(a.freq + b.freq);
        if (displayType(a) == "et"    && displayType(b) == "et")   return a.add(b);
        if (displayType(a) == "et"    || displayType(b) == "et")   return xen.et(a.add(b));
        if (displayType(a) == "cents" || displayType(b) == "cents") return xen.cents(a.add(b));
        return a.add(b);
    } catch (e) {
        throw new TypeError(`Ambiguous or incorrect call to +.
        ${givenVals(a, b)}`);
    }
}));

xen.inverse = mapList(function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return -a;
            case 'et':     return a.inverse();
            case 'cents':  return a.inverse();
            case 'ratio':  return a.inverse();
            case 'freq':   throw "Frequencies cannot be negative.";
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Unable to invert.
        ${givenVals(a)}`);
    }
});

xen.subtract = elementWise(mapList(function(a, b) {
    assertDefined(1, arguments);
    if (a == undefined) return xen.inverse(b);
    if (displayType(a) == "freq" && displayType(b) == "freq") return tune.Frequency(a.freq - b.freq);
    return xen.add(a, xen.inverse(b));
}));

xen.multiply = elementWise(mapList(function(a, b) {
    assertDefined(2, arguments);
    
    // both numbers, just multiply
    if (typeof a == "number" && typeof b == "number") return a * b;

    // at least one is not a number, do interval math
    if (typeof a == "number" && typeof b != "number") {
        if (displayType(b) == "freq") return tune.Frequency(b.freq * a);
        else return b.multiply(a);
    } else if (typeof b == "number" && typeof a != "number") {
        if (displayType(a) == "freq") return tune.Frequency(a.freq * b);
        return a.multiply(b);
    } else {
        throw new TypeError(`At least one argument to * must be a number.
        ${givenVals(a, b)}`);
    }
}));

xen.divide = elementWise(mapList(function(a, b) {
    assertDefined(2, arguments);

    try {
        // find numeric result
        if (typeof a == "number" && typeof b == "number") return a / b;

        if (displayType(a) == "freq") {
            switch (displayType(b)) {
                case "number": return tune.Frequency(a.freq / b);
                case 'et':     return xen.et(a).divideByInterval(b);
                case 'cents':  return xen.et(a).divideByInterval(b);
                case 'ratio':  throw "";
                case 'freq':   return a.freq / b.freq;
                default:       throw "";
            }
        }
        if (displayType(b) == 'freq') throw "";
        if (isInterval(a) && isInterval(b)) return a.divideByInterval(b);

        // at least one is not a number, do interval math
        if (isInterval(a) && typeof b == "number") return a.divide(b);
        if (typeof a == "number") throw ""; // can only divide a num by another num
        else throw "";
    } catch (e) {
        throw new TypeError(`Incompatible types for /.
    ${givenVals(a, b)}`);
    }
}));

xen.mod = elementWise(mapList(function(a, b) {
    assertDefined(2, arguments);

    try {
        // both numbers, just mod
        if (typeof a == "number" && typeof b == "number") return tune.Util.mod(a, b);

        /*         
        // at least one is not a number, do interval math
        if (typeof a == "number") a = tune.ETInterval(a);
        if (typeof b == "number") b = tune.ETInterval(b); */

        if (displayType(a) == "freq" && displayType(b) == 'freq') {
            return xen.freq(tune.Util.mod(a.freq, b.freq));
        }
        if (displayType(b) == 'freq') throw "";
        if (displayType(a) == 'ratio') {
            // fix odd rounding errors (maybe?)
            return xen.ratio(xen.et(a).mod(b));
        }
        if (isInterval(a) && isInterval(b)) return a.mod(b);
        else throw "";
    } catch (e) {
        throw new TypeError(`Incompatible types for %.
    ${givenVals(a, b)}`);
    }
}));

xen.normalize = mapList(function(a) {
    assertDefined(1, arguments);

    return xen.mod(a, tune.FreqRatio(2));
});

/**
 * Turns every interval into an ascending interval
 * 
 */
xen.abs = mapList(function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return Math.abs(a);
            case 'et':     return xen.et(Math.abs(a.n), a.d);
            case 'cents':  return xen.cents(Math.abs(xen.number(a)));
            case 'ratio':  return (a.n < a.d)? xen.ratio(a.d, a.n) : a;
            case 'freq':   return a;
            default:       return a;
        }
    } catch (e) {
        throw new TypeError(`Unable to take the absolute value.
        ${givenVals(a)}`);
    }
});

/**
 * Rounds an interval or number
 */
function abstractRound(a, round) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return round(a);
            case 'et':     return xen.et(round(a.n), a.d);
            case 'cents':  return xen.cents(round(xen.number(a)));
            case 'ratio':  return xen.et(round(xen.et(a).n));
            case 'freq':   return xen.freq(round(xen.number(a)));
            default:       return a;
        }
    } catch (e) {
        throw new TypeError(`Unable to round.
        ${givenVals(a)}`);
    }
};

xen.round = mapList(function(a) {
    return abstractRound(a, Math.round);
});

xen.ceil = mapList(function(a) {
    return abstractRound(a, Math.ceil);
});

xen.floor = mapList(function(a) {
    return abstractRound(a, Math.floor);
});


function abstractCompare(a, b, comp) {
    let inner = elementWise(mapList(function(a, b) {
        try {
            if (isInterval(a) && isInterval(b) || isNote(a) && isNote(b)) {
                return comp(xen.number(xen.cents(a)), xen.number(xen.cents(b)));
            } else if (isInterval(a) || isNote(a) || isInterval(b) || isNote(b)) {
                throw "";
            } else {
                return comp(a, b);
            }
        } catch (e) {
            throw new TypeError(`Cannot compare the given values.
            ${givenVals(a, b)}`);
        }
    }));
    
    return inner(a, b);
}


xen.greaterThan = function(a, b) {
    return abstractCompare(a, b, (a, b) => a > b);
}

xen.lessThan = function(a, b) {
    return abstractCompare(a, b, (a, b) => a < b);
}

xen.equal = function(a, b) {
    // if error is thrown, determine not equal
    try {
        let result = abstractCompare(a, b, (a, b) => a == b);
        return result;
    } catch (e) {
        return false;
    }
}

xen.random = function(n) {
    if (!n) return Math.random();
    let result = xen.list();
    while (n-- > 0) result.push(Math.random());
    return result;
}

xen.range = function(n, m) {
    if (m == undefined) m = n, n = 0;

    let result = xen.list(); 
    if (n < m) while (n <= m) result.push(n++); 
    else while (n >= m) result.push(n--); 
    return result;
}

xen.and = (a, b) => a && b
xen.or = (a, b) => a || b
xen.not = (_, a) => !a;
xen.notEqual = (a, b) => !xen.equal(a, b);
xen.greaterThanOrEqual = (a, b) => xen.greaterThan(a, b) || xen.equal(a, b)
xen.lessThanOrEqual = (a, b) => xen.lessThan(a, b) || xen.equal(a, b)