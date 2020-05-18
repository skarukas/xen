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
 * - debug function definitions
 * - make line break and semicolon seperate statements
 */

//import tune from "./tune"; // defined globally from tune.js

// Cents class not defined in tune
class Cents extends tune.ETInterval {
    // TAKES IN THE NUMBER OF STEPS!!
    constructor(c) {
        super(c);
    }
    static fromCount(n) {
        return new Cents(n / 100);
    }
    toString() {
        return this.cents() + "c";
    }
}

class List extends Array {
    constructor(...args) {
        if (args.length == 1) {
            // prevent calling the Array(arrLength) constructor
            super(1)
            this[0] = args[0];
        } else {
            super(...args);
        }
    }
    toString() {
        return `'(${super.toString()})`;
    }
    static from(arrlike) {
        return new List(...super.from(arrlike));
    }
}

// change display
tune.Frequency.prototype.toString = function() {
    return tune.Util.round(this.freq, 2) + "hz";
}
tune.ETInterval.prototype.toString = function() {
    return tune.Util.round(this.n, 2) + "#" + tune.Util.round(this.d, 2);
}

function isInterval(a) {
    let type = displayType(a);
    return type == "et" || type == "ratio" || type == "cents";
}

const xen = {};

xen.add = elementWise(mapList(function(a, b) {
    assertDefined(1, arguments);

    try {
        if (b == undefined) return xen.number(a);

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
    if (b == undefined) return xen.inverse(a);
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
xen.abstractRound = function(a, round) {
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
    return xen.abstractRound(a, Math.round);
});

xen.ceil = mapList(function(a) {
    return xen.abstractRound(a, Math.ceil);
});

xen.floor = mapList(function(a) {
    return xen.abstractRound(a, Math.floor);
});


xen.colon = function(a, b) {
    assertDefined(1, arguments);
    // creating compound ratios, e.g. 4:5:6:7:11
    if (typeof b == 'number' && displayType(a) == 'ratio') return new List(a.inverse(), tune.FreqRatio(b, a.n));
    if (typeof b == 'number' && displayType(a) == 'list' && displayType(a[0]) == 'ratio')  {
        let result = new List();
        // check that they're all ratios
        for (let e of a) {
            if (displayType(e) != 'ratio') throw "Unable to create compound ratio.";
            result.push(e);
        }
        result.push(tune.FreqRatio(b, a[0].d));
        return result;
    }

    else return xen.ratio(a, b);
}

xen.ratio = elementWise(mapList(function(a, b) {
    assertDefined(1, arguments);
    try {
        if (typeof b == 'number' && typeof a != 'number') throw "";
        switch (displayType(a)) {
            case "number": return tune.FreqRatio(a, b);
            case 'et':     return a.asFrequency();
            case 'cents':  return xen.et(a).asFrequency();
            case 'ratio':  return a;
            case 'freq':   throw "";
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Incompatible type(s) for ratio constructor.
        ${givenVals(a, b)}`);
    }
}));

xen.normalize = mapList(function(a) {
    assertDefined(1, arguments);

    return xen.mod(a, tune.FreqRatio(2));
});

/**
 * Rounds a ratio to make it simpler
 * 
 * @param r - an interval to make into a simplified ratio 
 *            (lists are also fine, as they will be mapped)
 * @param err - an interval of allowable error
 */
xen.simplify = mapList(function(interval, err = Cents.fromCount(5)) {
    assertDefined(1, arguments);
    try {
        if (!isInterval(interval)) throw "";
        if (!isInterval(err)) throw "";
        let r = interval.asFrequency();
        let d = r.d;
        let n = r.decimal();
        err = err.asFrequency().decimal();
        err = (err - 1) * n;

        let x = n, 
            a = Math.floor(x), 
            h1 = 1, h2, 
            k1 = 0, k2, 
            h = a, k = 1;
        while (x - a > err * k * k) {
            x = 1 / (x - a);
            a = Math.floor(x);
            h2 = h1;
            h1 = h;
            k2 = k1;
            k1 = k;
            // about to get to the original ratio's level of accuracy, 
            //    so don't proceed
            if (k2 + a * k1 == d) break;
            h = h2 + a * h1;
            k = k2 + a * k1;
        }
        return tune.FreqRatio(h, k);
    } catch (e) {
        throw new TypeError(`Incompatible type(s) for simplify().
        ${givenVals(...arguments)}`);
    }
});

xen.closest = function(interval, maxErr, numRatios) {
    assertDefined(1, arguments);

    try {
        if (typeof maxErr == 'number') {
            if (numRatios && !isInterval(numRatios)) throw "";
            let temp = numRatios;
            numRatios = maxErr;
            maxErr = temp;
        }
        numRatios = numRatios || 5;
        maxErr = maxErr || Cents.fromCount(30);
        // return ET numbers
        if (displayType(interval) == 'list') return List.from(tune.ET.bestFitETs(interval, undefined, numRatios));
        // return intervals that are close
        return (displayType(interval) == 'ratio')? xen.closestETs(interval, numRatios) : xen.closestRatios(interval, maxErr, numRatios);
    } catch (e) {
        throw new TypeError(`Incompatible type(s) for closest().
        ${givenVals(...arguments)}`);
    }
};

// private (no type checking or error handline)
xen.closestETs = function(interval, numETs) {
    let errorArr = new List();
    let maxBase = 53;
    let base = 1;

    while (base < maxBase) {
        let et = interval.getNearestET(base++);
        let error = Math.abs(et.cents() - interval.cents());
        errorArr.push({ et, error })
        //if (error < maxErr.cents()) result.push(et);
    }

    // sort by ascending error, or base if error is equal
    let sorted = errorArr.sort((a, b) => (a.error === b.error) ? a.et.d - b.et.d : a.error - b.error);
    return sorted.map((pair) => pair.et).slice(0, numETs);
}

// private (no type checking or error handline)
xen.closestRatios = function(interval, maxErr, numRatios) {
    let intervalDec = interval.asFrequency().decimal();
    maxErr = maxErr.asFrequency().decimal();
    maxErr = (maxErr - 1) * intervalDec;

    let result = new List();
    let count = 0;

    for (let d = 1; count < numRatios; d++) {
        // find closest ratio with a certain denominator
        let n = Math.round(intervalDec * d);
        let err = Math.abs(intervalDec - (n / d));
        
        // check if it's within range and not already seen
        //   new ratios will be a simplified fraction (coprime n, d)
        if (err <= maxErr && coprime(n, d)) {
            result.push(tune.FreqRatio(n, d));
            count++;
        }
    }
    return result;
}

/**
 * Determine whether two numbers are coprime (relatively prime)
 */
function coprime(a, b) {
    if(!((a | b) & 1)) return false; // short circuit for both even integers

    while(b) {
        let t = a % b;
        a = b;
        b = t;
    }
    return a == 1; // a = gcd
}

xen.et = elementWise(mapList(function(a, b, c) {
    assertDefined(1, arguments);
    
    try {

        // If third argument (octave size) is specified, scale b
        if (isInterval(c)) {
            let octaveRatioAsDecimal = xen.ratio(c).decimal();
            b = b * tune.Util.log(2, octaveRatioAsDecimal);
        }
        if (b && typeof b != 'number') throw "";
        switch (displayType(a)) {
            case "number": return tune.ETInterval(a, b);
            case 'et':     return a.asET(b);
            case 'cents':  return tune.ETInterval(a.cents() / 100).asET(b);
            case 'ratio':  return a.asET(b);
            case 'freq':   return xen.ftom(a.freq, b);
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Incompatible type(s) for et constructor.
        ${givenVals(a, b)}`);
    }
}));

xen.cents = mapList(function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return Cents.fromCount(a);
            case 'et':     return Cents.fromCount(a.cents());
            case 'cents':  return a;
            case 'ratio':  return Cents.fromCount(a.cents());
            case 'freq':   return Cents.fromCount(a.cents());
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Unable to convert to cents.
        ${givenVals(a)}`);
    }
});

xen.freq = mapList(function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return tune.Frequency(a);
            case 'et':     return xen.mtof(a);
            case 'cents':  return xen.mtof(a);
            case 'ratio':  throw "";
            case 'freq':   return a;
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Unable to convert to Hz.
        ${givenVals(a)}`);
    }
});

xen.null = () => undefined;

xen.number = mapList(function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return a;
            case 'et':     return a.asET().n;
            case 'cents':  return a.cents();
            case 'ratio':  return a.n / a.d;
            case 'freq':   return a.freq;
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Unable to convert to number.
        ${givenVals(a)}`);
    }
});

xen.mtof = mapList(function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return tune.Frequency(tune.Util.ETToFreq(a));
            case 'et':     return tune.Frequency(tune.Util.ETToFreq(a.asET().n));
            case 'cents':  return tune.Frequency(tune.Util.ETToFreq(a.cents() / 100));
            case 'ratio':  throw "";
            case 'freq':   throw "";
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Incompatible type for mtof().
        ${givenVals(a)}`);
    }
});

xen.ftom = mapList(function(a, b) {
    assertDefined(1, arguments);

    try {
        if (typeof b != "number" && typeof b != 'undefined') throw "";
        switch (displayType(a)) {
            case "number": return tune.ETInterval(tune.Util.freqToET(a, b), b);
            case 'et':     throw "";
            case 'cents':  throw "";
            case 'ratio':  throw "";
            case 'freq':   return tune.ETInterval(tune.Util.freqToET(a.freq, b), b);
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Incompatible type(s) for ftom().
        ${givenVals(a, b)}`);
    }
});

xen.list = function(...args) {
    return new List(...args);
}

xen.approxpartials = function(...args) {
    // flatten args and convert to freq
    args = args.flat(Infinity).map((e) => xen.freq(e).freq); 
    // find best fit
    let result = tune.AdaptiveTuning.bestFitPartialsFromFreq(args);
    let f = xen.freq(result.fundamental);
    let ratios = List.from(result.partials.map((e) => xen.ratio(e)));
    return new List(f, ratios);
}

xen.just = function(...args) {
    args = args.flat(Infinity);
    if (args.length) {
        let type = displayType(args[0]);
        // allow ratios in thru hacks
        if (type == 'ratio')  {
            args = args.map((e) => xen.et(e));
            args.push(tune.ETInterval(0));
        }

        let [f, ratios] = xen.approxpartials(args);

        if (type == 'ratio') {
            // more hacks
            let denom = ratios.pop();
            return ratios.map((r) => xen.subtract(r, denom));
        } else {
            return ratios.map((r) => {
                // add and convert back to original type
                let sum = xen.add(r, f);
                return xen[type](sum);
            }); 
        }
    }
}

xen.play = function(...args) {
    let C = tune.Frequency(261.63); // default to middle C
    let baseFreq;
    let freqs = [];
    let waveshape;

    try {
        // convert all to freqs and add them
        processArgs(args);
        // call the audio-producing function
        external.playback(freqs, waveshape);
    } catch (e) {
        throw e || new TypeError(`Ambiguous or incorrect call to play().
        ${givenVals(...args)}`);
    }

    function processArgs(arr) {
        let f;
        for (let arg of arr) {
            switch (displayType(arg)) {
                case 'waveshape':
                    waveshape = arg.description;
                    break;
                case 'list':   
                    processArgs(arg); // flatten the list
                    break;
                case 'et':
                    // if small, interpret as an interval
                    if (xen.freq(arg).freq < 20) addRelative(arg);
                    else addFixed(arg); // otherwise, convert to freq
                    break;
                // convert to freq
                case 'number': 
                case 'freq': 
                    addFixed(arg);
                    break;
                // play above the base freq
                case 'cents':  
                case 'ratio':
                    addRelative(arg);
                    break;
                default:
                    throw "";
            }
        }
        // interpret the value as a fixed freq
        function addFixed(arg) {
            f = xen.freq(arg);
            freqs.push(f.freq);
            baseFreq = baseFreq || f;
        }
        // interpret the value as an interval
        function addRelative(arg) {
            // C = default
            if (!baseFreq) {
                // if no base frequency, use C and play it back
                baseFreq = C;
                freqs.push(xen.freq(C).freq);
            }
            f = baseFreq.noteAbove(arg);
            freqs.push(f.freq);
        }
    }
}

// default value for external.playback
xen.playback = function(freqs) {
    throw "play() is not supported in this implementation.";
}

function assertDefined(numArgs, argues) {
    let args = Array.from(argues);
    for (let i = 0; i < numArgs; i++) {
        if (typeof args[i] == 'undefined') {
            throw `Expected ${numArgs} argument(s).
            ${givenVals(...args)}`;
        }
    }
}

/**
 * Check that the arguments of a function are the correct type 
 * before execution.
 */
function typeCheck(fn, ...types) {
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

/**
 * 
 * Template for Given: ..., ... (..., ...)
 */
function givenVals(...args) {
    let result = "Given: ";
    args = args.filter(a => typeof a != 'undefined');
    // value (type)
    result += args.map((a) => `${a} (${displayType(a)})`).join(", ");
    return result;
}


/**
 * Determine how to display type names
 */
function displayType(data) {
    return (data == undefined)? "undefined" : (typeMap[data.constructor.name] || "javascript " + data.constructor.name.toLowerCase());
}

const typeMap = {
    "Number": "number",
    "ETInterval": "et",
    "FreqRatio": "ratio",
    "Cents": "cents",
    "Frequency": "freq",
    "List": "list",
    "Symbol": "waveshape"
}

var waves = {
    saw: Symbol("sawtooth"),
    tri: Symbol("triangle"),
    sine: Symbol("sine"),
    square: Symbol("square"),
}

/**
 * Public xen language variables and functions
 */
const variables = {
    ans: undefined,
    pi: Math.PI,
    e: Math.E,
    fifth: tune.JI.fifth,
    third: tune.JI.third,
    seventh: tune.JI.seventh,
    octave: tune.FreqRatio(2),
    sawtooth: waves.saw,
    saw: waves.saw,
    sine: waves.sine,
    triangle: waves.tri,
    tri: waves.tri,
    square: waves.square,
    rect: waves.square,

    //// Functions
    // operator substitutes
    add: xen.add,
    subtract: xen.subtract,
    multiply: xen.multiply,
    divide: xen.divide,
    mod: xen.mod,
    // function that only work on numbers
    sin:  mapList(typeCheck(Math.sin, "number")),
    cos:  mapList(typeCheck(Math.cos, "number")),
    tan:  mapList(typeCheck(Math.tan, "number")),
    asin: mapList(typeCheck(Math.asin, "number")),
    acos: mapList(typeCheck(Math.acos, "number")),
    atan: mapList(typeCheck(Math.atan, "number")),
    log:  mapList(typeCheck(tune.Util.log, "number")), // tune version allows argument for base
    exp:  mapList(typeCheck(Math.exp, "number")),
    sqrt: mapList(typeCheck(Math.sqrt, "number")),
    max: typeCheck(Math.max, "number"),
    min: typeCheck(Math.max, "number"),
    round: xen.round,
    ceil:  xen.ceil,
    floor: xen.floor,
    abs: xen.abs,
    random: (n) => {
        if (!n) return Math.random();
        let result = new List();
        while (n-- > 0) result.push(Math.random());
        return result;
    },
    // xen constructors
    ratio: xen.ratio,
    et: xen.et,
    cents: xen.cents,
    freq: xen.freq,
    number: xen.number,
    list: xen.list,
    "'": xen.list,
    // xen functions
    inverse: xen.inverse,
    normalize: xen.normalize,
    mtof: xen.mtof,
    ftom: xen.ftom,
    play: xen.play,
    // adaptive tuning
    approxpartials: xen.approxpartials,
    simplify: xen.simplify,
    just: xen.just,
    closest: xen.closest,

    // M E T A
    xen_eval: (str) => {
        let results = calculate(str);
        results = results.filter(e => e != undefined);
        if (results.length) return results[results.length-1].value;
    }
};

// allow JS code to reference and modify the variables object itself
variables.xen_variables = variables;

/**
 * Takes a function and turns it into a version that applies 
 * it to all elements if the first input is a list.
 */
function mapList(fn) {
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
function elementWise(fn) {
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
            return List.from(result);
        } else {
            return fn(...args);
        }
    }
}

// stores all available macros (@macroname)
const macros = {};
//  ********* LEXER *********

var lex = function(input) {
    var isOperator = function(c) {
        return /[+\-*\/\^%=(),:;\#]/.test(c);
        },
        isDigit = function(c) {
            return /[0-9]/.test(c);
        },
        isWhiteSpace = function(c) {
            return /\s/.test(c);
        },
        isMacro = function(c) {
            return c == "@";
        },
        isIdentifier = function(c) {
            return typeof c === "string" && !isOperator(c) && !isDigit(c) && !isWhiteSpace(c) && !isMacro(c);
        };

    var tokens = [],
        c, i = 0;
    var advance = function() {
        return c = input[++i];
    };
    var addToken = function(type, value) {
        tokens.push({
            type: type,
            value: value
        });
    };
    while (i < input.length) {
        c = input[i];
        if (isWhiteSpace(c)) {
            advance();
        } else if (isOperator(c)) {
            addToken(c);
            advance();
        } else if (isDigit(c)) {
            var num = c;
            while (isDigit(advance())) num += c;
            if (c === ".") {
                do num += c;
                while (isDigit(advance()));
            }
            num = parseFloat(num);
            if (!isFinite(num)) throw "Number is too large or too small for a 64-bit double.";
            addToken("number", num);
        } else if (isIdentifier(c)) {
            var idn = c;
            while (isIdentifier(advance())) idn += c;

            // catch the postfix operators
            if (idn.toLowerCase() == "c")  addToken("c");
            else if (idn.toLowerCase() == "hz") addToken("hz");
            else addToken("identifier", idn);
        } else if (isMacro(c)) {
            // recover macro identifier
            let macroId = "";
            while (!isWhiteSpace(advance())) macroId += c;
            if (! (macroId in macros)) throw `Invalid macro.
            Available Macros: ${Object.keys(macros).map(tg => " @" + tg)}`;

            // automatically fixed by trim()
            /* // get rid of whitespace after macro id
            while (isWhiteSpace(advance())); */

            // pre-block content (if any)
            let pre = "";
            // block content (if any)
            let block = "";

            do { 
                if (c == "{") {
                    parseBlock(); 
                    break;
                } else {
                    pre += c;
                }
            } while(advance() != "\n" && c != undefined);

            function parseBlock() {
                // block of code--process until the end (e.g. brackets are balanced)

                c = ""; // stops the first bracket char from being added
                let bracketCount = 1;
                while (bracketCount != 0) {
                    block += c;
                    advance();
                    if (c == "}") bracketCount--;
                    else if (c == "{") bracketCount++;
                    else if (c == undefined) throw new SyntaxError("Incomplete block.");
                }
                advance();
            }

            addToken("macro", {macroId, pre, block});
        } else {
            throw "Unrecognized token.";
        }
    }
    addToken("(end)");
    return tokens;
};

//  ********* PARSER *********

var parse = function(tokens) {
    var symbols = {},
        symbol = function(id, lbp, nud, led) {
            if (!symbols[id]) {
                symbols[id] = {
                    lbp: lbp,
                    nud: nud,
                    led: led
                };
            }
            else {
                if (nud) symbols[id].nud = nud;
                if (led) symbols[id].led = led;
                if (lbp) symbols[id].lbp = lbp;
            }
        };

    symbol(",");
    symbol(")");
    symbol("(end)");

    var interpretToken = function(token) {
        var F = function() {};
        F.prototype = symbols[token.type];
        var sym = new F;
        sym.type = token.type;
        sym.value = token.value;
        return sym;
    };

    var i = 0,
        token = function() {
            return interpretToken(tokens[i]);
        };
    var advance = function() {
        i++;
        return token();
    };

    var expression = function(rbp) {
        var left, t = token();
        advance();
        if (!t.nud) throw "Unexpected token: " + t.type;
        left = t.nud(t);
        while (rbp < token().lbp) {
            t = token();
            advance();
            if (!t.led) throw "Unexpected token: " + t.type;
            left = t.led(left);
        }
        return left;
    };

    var infix = function(id, lbp, rbp, led) {
        rbp = rbp || lbp;
        symbol(id, lbp, null, led ||
        function(left) {
            return {
                type: id,
                left: left,
                right: expression(rbp)
            };
        });
    },
    prefix = function(id, rbp, nud) {
        symbol(id, null, nud ||
        function() {
            return {
                type: id,
                right: expression(rbp)
            };
        });
    },
    postfix = function (id, lbp, led) {
        symbol(id, lbp, null, led ||
        function (left) {
            return {
                type: id,
                left: left
            };
        });
    };

    prefix("number", 9, function(number) {
        return number;
    });
    
    prefix("identifier", 9, function(name) {
        if (token().type === "(") {
            var args = [];
            if (tokens[i + 1].type === ")") advance();
            else {
                do {
                    advance();
                    args.push(expression(2));
                } while (token().type === ",");
                if (token().type !== ")") throw "Expected closing parenthesis ')'";
            }
            advance();
            return {
                type: "call",
                args: args,
                name: name.value
            };
        }
        return name;
    });

    // macros are not parsed until evaluation
    prefix("macro", 9, (data) => data);

    prefix("(", 8, function() {
        let value = expression(2);
        if (token().type !== ")") throw "Expected closing parenthesis ')'";
        advance();
        return value;
    });

    // interval operators
    infix(":", 7.5);
    infix("#", 7.3);
    prefix("#", 7);
    prefix(":", 7);
    //unary operators
    prefix("-", 6.5);
    prefix("+", 6.5);
    // postfix
    postfix("c", 6.8);
    postfix("hz", 6.8);

    infix("^", 6, 5);
    infix("*", 4);
    infix("/", 4);
    infix("%", 4);
    infix("+", 3);
    infix("-", 3);

    infix("=", 1, 2, function(left) {
        if (left.type === "call") {
            for (var i = 0; i < left.args.length; i++) {
                if (left.args[i].type !== "identifier") throw "Invalid argument name";
            }
            return {
                type: "function",
                name: left.name,
                args: left.args,
                value: expression(2)
            };
        } else if (left.type === "identifier") {
            return {
                type: "assign",
                name: left.value,
                value: expression(2)
            };
        }
        else throw "Invalid lvalue";
    });
    postfix(";", 1);

    var parseTree = [];
    while (token().type !== "(end)") {
        parseTree.push(expression(0));
    }
    return parseTree;
};

var operators = {
    "+": xen.add,
    "-": xen.subtract,
    "*": xen.multiply,
    "/": xen.divide,
    "%": xen.mod,
    "^": elementWise(mapList(typeCheck(Math.pow, "number"))),
    ":": xen.colon,
    "#": xen.et,
    "c": xen.cents,
    "hz": xen.freq,
    ";": xen.null
};

var args = {};

// add an available macro to the array
function addMacro(name, op) {
    macros[name] = op;
}


// @js evaluates the block as JavaScript
addMacro("js", function(pre, block) {
    // only parse block, or pre as an expression if there is no block.
    block = block || ("return " + pre);

    let executeBlock;
    try {
        // pass in variables to put them in scope
        executeBlock = new Function("xen", "args",
        `// all variables undeclared or declared with 'var' will be added to xen
        function storeVars(target) {
            return new Proxy(target, {
                has(target, prop) { return true; },
                get(target, prop) { 
                    // function scope, local scope, then global scope
                    if (prop in args)   return args[prop];
                    if (prop in target) return target[prop];
                    return window[prop];
                }
            });
        }

        with(storeVars(xen)) {
            // run the code
            ${block};
        }`);
    } catch(e) {
        throw "Error Parsing JavaScript.\n" + e;
    }

    try {
        return executeBlock(variables, args);
    } catch(e) {
        throw "Error Running JavaScript.\n" + e;
    }
});

// @comment (@@) does nothing to the block
addMacro("comment");
addMacro("@");

addMacro("scl", function(pre, content) {
    let lines = content.split("\n");
    let scale = [];
    let i = 0;

    let regRatio = /(\d+\s*)(\/(\s*\d+))?/; /* [..., a, /b, b] */
    let regCents = /(\d*\.\d*)/;
    
    /* remove empty lines + comments*/
    while (lines[i].trim() == "" ||lines[i][0] == "!") i++;

    let description = lines[i++];
    let notesPerOctave = parseInt(lines[i++]);

    while (++i < lines.length) {
        let line = lines[i];
        if (line.trim() == "" || line[0] == "!") continue;

        let test;
        /* N.B. assignment in conditional returns the bool value of test */
        if (test = line.match(regCents)) {
            let c = parseFloat(test[1]);
            scale.push(xen.cents(c));
        } else if (test = line.match(regRatio)) {
            let n = parseInt(test[1]);
            let d = parseInt(test[3] || 1);
            scale.push(xen.ratio(n, d));
        } else  {
            throw "Error in .scl file format." + line
        }
    };
    // option to return all the info
    if (pre == "*") return { description, notesPerOctave, scale };

    return scale;
});

// @macro defines a new type of block 
//     M E T A
addMacro("macro", function(name, blockDefinition) {
    if (!name) throw new SyntaxError(`Block definitions must be given a name.`);
    let generateBlockFn;
    try {
        generateBlockFn = new Function("xen", "args",
        `// all variables undeclared or declared with 'var' will be added to xen
        function storeVars(target) {
            return new Proxy(target, {
                has(target, prop) { return true; },
                get(target, prop) { 
                    // function scope, local scope, then global scope
                    if (prop in args)   return args[prop];
                    if (prop in target) return target[prop];
                    return window[prop];
                }
            });
        }
        with(storeVars(xen)) {
            return function (pre, content) {
                ${blockDefinition};
            }
        }`);
    } catch(e) {
        throw "Error Parsing JavaScript.\n" + e;
    }

    try {
        addMacro(name, generateBlockFn(variables, args));
    } catch(e) {
        throw "Error Running JavaScript.\n" + e;
    }
});

//  ********* EVALUATOR *********

var evaluate = function(parseTree) {

    var parseNode = function(node) {
        if (node.type === "number") {
            return node.value;
        } else if (operators[node.type]) {
            // : is the only operator that does not map lists by default (due to compound ratio expansions)
            let fn = operators[node.type];
            if (node.right && node.left) return fn(parseNode(node.left), parseNode(node.right)); // binary
            return fn(parseNode(node.right || node.left)); // unary
        } else if (node.type === "identifier") {
            var value = args.hasOwnProperty(node.value) ? args[node.value] : variables[node.value];
            if (typeof value === "undefined") throw node.value + " is undefined";
            if (value instanceof Function) throw new SyntaxError(`Missing parentheses in call to ${node.value}()`);
            return value;
        } else if (node.type === "assign") {
            variables[node.name] = parseNode(node.value);
        } else if (node.type === "call") {
            let args = [];
            for (var i = 0; i < node.args.length; i++) args[i] = parseNode(node.args[i]);
            let fn = variables[node.name];
            if (typeof fn === 'undefined') throw node.name + "() is undefined";
            return fn(...args);
        } else if (node.type === "function") {
            variables[node.name] = function() {
                for (var i = 0; i < node.args.length; i++) {
                    args[node.args[i].value] = arguments[i];
                }
                var ret = parseNode(node.value);
                args = {};
                return ret;
            };
        } else if (node.type === "macro") {
            let value = node.value;
            let fn = macros[value.macroId];
            if (fn == undefined) return;
            return fn(value.pre.trim(), value.block.trim());
        }
    };

    // eval the parseTree, returning all vals in an array of value-type pairs
    let output = parseTree.map((node) => {
        var value = parseNode(node);
        if (typeof value !== "undefined") {
            let type = displayType(value);
            // store answer
            variables.ans = value;
            if (typeof value == 'symbol') return {value: value.description, type};
            else return {value, type};
        }
    });
    return output;
};
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
    "playback": xen.playback
}

export default external;