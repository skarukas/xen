(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.xen = factory());
}(this, (function () { 'use strict';

    /**
     * All these are constants which cannot be changed
     */

    var waves = {
        saw: Symbol("sawtooth"),
        tri: Symbol("triangle"),
        sine: Symbol("sine"),
        square: Symbol("square"),
    };

    /**
     * Public xen language variables and functions
     */
    const xen = {
        "...": Symbol("..."),
        true: true,
        false: false,
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
    };

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
    };

    function isInterval(a) {
        let type = displayType(a);
        return type == "et" || type == "ratio" || type == "cents";
    }

    function isNote(a) {
        let type = displayType(a);
        return type == "et" || type == "freq" || type == "cents";
    }

    /**
     * Determine how to display type names
     */
    function displayType(data) {
        if (data == undefined) return "undefined";
        if (data.partialArgs) return "partial function";
        if (data == xen["..."]) return "hole";

        return (typeMap[data.constructor.name] || "js." + data.constructor.name);
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

    function assertDefined(numArgs, argues) {
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
    function givenVals(...args) {
        let result = "Given: ";
        args = args.filter(a => typeof a != 'undefined');
        // value (type)
        result += args.map((a) => `${a} (${displayType(a)})`).join(", ");
        return result;
    }

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

    class XenList extends Array {
        constructor(...args) {
            if (args.length == 1) {
                // prevent calling the Array(arrLength) constructor
                super(1);
                this[0] = args[0];
            } else {
                super(...args);
            }
        }
        toString() {
            return `[${super.toString()}]`;
        }
        static from(arrlike) {
            return new XenList(...super.from(arrlike));
        }
    }

    // change display
    tune.Frequency.prototype.toString = function() {
        return tune.Util.round(this.freq, 2) + "hz";
    };
    tune.ETInterval.prototype.toString = function() {
        return tune.Util.round(this.n, 2) + "#" + tune.Util.round(this.d, 2);
    };

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
                return XenList.from(result);
            } else {
                return fn(...args);
            }
        }
    }

    /**
     * Rounds a ratio to make it simpler
     * 
     * @param r - an interval to make into a simplified ratio 
     *            (lists are also fine, as they will be mapped)
     * @param err - an interval of allowable error
     */
    xen.simplify = mapList(function(interval, err = xen.cents(5)) {
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
            maxErr = maxErr || xen.cents(30);
            // return ET numbers
            if (displayType(interval) == 'list') return xen.list(...tune.ET.bestFitETs(interval, undefined, numRatios));
            // return intervals that are close
            return (displayType(interval) == 'ratio')? xen.closestETs(interval, numRatios) : xen.closestRatios(interval, maxErr, numRatios);
        } catch (e) {
            throw new TypeError(`Incompatible type(s) for closest().
        ${givenVals(...arguments)}`);
        }
    };

    // private (no type checking or error handline)
    xen.closestETs = function(interval, numETs) {
        let errorArr = xen.list();
        let maxBase = 53;
        let base = 1;

        while (base < maxBase) {
            let et = interval.getNearestET(base++);
            let error = Math.abs(et.cents() - interval.cents());
            errorArr.push({ et, error });
            //if (error < maxErr.cents()) result.push(et);
        }

        // sort by ascending error, or base if error is equal
        let sorted = errorArr.sort((a, b) => (a.error === b.error) ? a.et.d - b.et.d : a.error - b.error);
        return sorted.map((pair) => pair.et).slice(0, numETs);
    };

    // private (no type checking or error handline)
    xen.closestRatios = function(interval, maxErr, numRatios) {
        let intervalDec = interval.asFrequency().decimal();
        maxErr = maxErr.asFrequency().decimal();
        maxErr = (maxErr - 1) * intervalDec;

        let result = xen.list();
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
    };

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

    xen.approxpartials = function(...args) {
        // flatten args and convert to freq
        args = args.flat(Infinity).map((e) => xen.freq(e).freq); 
        // find best fit
        let result = tune.AdaptiveTuning.bestFitPartialsFromFreq(args);
        let f = xen.freq(result.fundamental);
        let arr = result.partials.map((e) => xen.ratio(e));
        let ratios = xen.list(...arr);
        return xen.list(f, ratios);
    };

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
    };

    xen.consistent = function(limit, edo) {
        for (let a = 1; a <= limit - 4; a += 2) {
            for (let b = a + 2; b <= limit - 2; b += 2) {
                for (let c = b + 2; c <= limit; c += 2) {
                    let ratios = xen.list(
                        xen.ratio(b, a),
                        xen.ratio(c, b),
                        xen.ratio(c, a));
                    ratios = xen.round( xen.et(ratios, edo) );
                    if (ratios[0].n + ratios[1].n != ratios[2].n) return false;
                }
            }
        }
        return true;
    };

    xen.smallest_consistent = function(limit) {
        if (limit >= 50) throw new RangeError(`This operation is too complex to be performed with the given value.
    ${givenVals(limit)}`);
        let edo = 0;
        while (!xen.consistent(limit, ++edo));
        return edo;
    };

    xen.__colon = function(a, b) {
        assertDefined(1, arguments);
        // creating compound ratios, e.g. 4:5:6:7:11
        if (typeof b == 'number' && displayType(a) == 'ratio') return xen.list(xen.ratio(a.n, a.n), a.inverse(), xen.ratio(b, a.n));
        if (typeof b == 'number' && displayType(a) == 'list' && displayType(a[0]) == 'ratio')  {
            let result = xen.list();
            // check that they're all ratios
            for (let e of a) {
                if (displayType(e) != 'ratio') throw "Unable to create compound ratio.";
                result.push(e);
            }
            result.push(tune.FreqRatio(b, a[0].d));
            return result;
        }

        else return xen.ratio(a, b);
    };

    xen.ratio = elementWise(mapList(function(a, b) {
        assertDefined(1, arguments);
        if (a == undefined) a = b, b = undefined; // unary

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

    xen.et = elementWise(mapList(function(a, b, c) {
        assertDefined(1, arguments);
        if (a == undefined) a = b, b = undefined; // unary

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

    xen.cents = mapList(function(a, _a) {
        assertDefined(1, arguments);
        if (a == undefined) a = _a, _a = undefined; // unary

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

    xen.freq = mapList(function(a, _a) {
        assertDefined(1, arguments);
        if (a == undefined) a = _a, _a = undefined; // unary

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

    xen.__null = () => undefined;

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

    xen.list = function(...args) {
        for (let arg of args) {
            if (arg == xen["..."]) throw "";
            if (arg instanceof Function) throw `TypeError: Cannot create a list of functions.
        ${givenVals(...args)}`;
        }
        return new XenList(...args);
    };

    xen["'"] = xen.list;

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
    }
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

        let result = inner(a, b);
        if (displayType(result) == 'list') result = result.every(e => e);
        return result;
    }


    xen.greaterThan = function(a, b) {
        return abstractCompare(a, b, (a, b) => a > b);
    };

    xen.lessThan = function(a, b) {
        return abstractCompare(a, b, (a, b) => a < b);
    };

    xen.equal = function(a, b) {
        // if error is thrown, determine not equal
        try {
            let result = abstractCompare(a, b, (a, b) => a == b);
            return result;
        } catch (e) {
            return false;
        }
    };

    xen.random = function(n) {
        if (!n) return Math.random();
        let result = xen.list();
        while (n-- > 0) result.push(Math.random());
        return result;
    };

    xen.and = (a, b) => a && b;
    xen.or = (a, b) => a || b;
    xen.not = (_, a) => !a;
    xen.notEqual = (a, b) => !xen.equal(a, b);
    xen.greaterThanOrEqual = (a, b) => xen.greaterThan(a, b) || xen.equal(a, b);
    xen.lessThanOrEqual = (a, b) => xen.lessThan(a, b) || xen.equal(a, b);

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
    };

    xen.sin =  mapList(typeCheck(Math.sin, "number"));

    xen.cos =  mapList(typeCheck(Math.cos, "number"));

    xen.tan =  mapList(typeCheck(Math.tan, "number"));

    xen.asin = mapList(typeCheck(Math.asin, "number"));

    xen.acos = mapList(typeCheck(Math.acos, "number"));

    xen.atan = mapList(typeCheck(Math.atan, "number"));

    xen.log =  mapList(typeCheck(tune.Util.log, "number")); // tune version allows argument for base

    xen.exp =  mapList(typeCheck(Math.exp, "number"));

    xen.sqrt = mapList(typeCheck(Math.sqrt, "number"));

    xen.max =  typeCheck(Math.max, "number");

    xen.min =  typeCheck(Math.max, "number");

    xen.pow =  elementWise(mapList(typeCheck(Math.pow, "number")));

    /**
     * The original designer made everything incredibly tightly coupled 
     *   so this parser is pretty messy.
     * 
     * - TODO: clean up this disgusting thing
     */

    //  ********* PARSER *********
    /* 
    const parser = {};
    export default parser;

    parser.infix = function(id, lbp, rbp, led) {
        rbp = rbp || lbp;
        symbol(id, lbp, null, led ||
        function(left) {
            return {
                type: id,
                left: left,
                right: expression(rbp)
            };
        });
    };
    parser.prefix = function(id, rbp, nud) {
        symbol(id, null, nud ||
        function() {
            return {
                type: id,
                right: expression(rbp)
            };
        });
    };
    parser.postfix = function(id, lbp, led) {
        symbol(id, lbp, null, led ||
        function (left) {
            return {
                type: id,
                left: left
            };
        });
    };

    var symbols = {};
    function symbol(id, lbp, nud, led) {
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
    }


    function interpretToken(token) {
        var F = function() {};
        F.prototype = symbols[token.type];
        var sym = new F;
        sym.type = token.type;
        sym.value = token.value;
        return sym;
    };

    symbol(",");
    symbol(")");
    symbol("(end)");

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

    let tokens;

    var i = 0,
        token = function() {
            return interpretToken(tokens[i]);
        };
    var advance = function() {
        i++;
        return token();
    };


    parser.parse = function(tokenArr) {
        tokens = tokenArr;

        var parseTree = [];
        while (token().type !== "(end)") {
            parseTree.push(expression(0));
        }
        return parseTree;
    };


    parser.prefix("identifier", 9, function(name) {
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

    parser.prefix("(", 8, function() {
        let value = expression(2);
        if (token().type !== ")") throw "Expected closing parenthesis ')'";
        advance();
        return value;
    });


    parser.infix("=", 1, 2, function(left) {
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

    parser.prefix("number", 9, function(number) {
        return number;
    });

    // macros are not parsed until evaluation
    parser.prefix("macro", 9, (data) => data); */

    /* export const prefixes = {
        "#": 7,
        ":": 7,
        //unary operators
        "-": 6.5,
        "+": 6.5,
        "!": 6.5,
    };
    export const infixes = {
        ":": 7.5,
        "#": 7.3,
        "^": [6, 5],
        "*": 4,
        "/": 4,
        "%": 4,
        "+": 3,
        "-": 3,
        ">": 2.80,
        "<": 2.80,
        ">=": 2.80,
        "<=": 2.80,
        "==": 2.70,
        "!=": 2.70,
        "&&": 2.65,
        "||": 2.60,
    };
    export const postfixes = {
        "c": 6.8,
        "hz": 6.8,
        "~": 2.5,
        ";": 1,
    }; */

    const prefixes = {};
    const infixes = {};
    const postfixes = {};

    //  ********* PARSER *********

    function parse(tokens) {
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
        symbol("]");
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

        for (let pre in prefixes) {
            let data = prefixes[pre];
            prefix(pre, ...((data.length) ? data : [data]));
        }
        for (let inf in infixes) {
            let data = infixes[inf];
            infix(inf, ...((data.length) ? data : [data]));
        }
        for (let post in postfixes) {
            let data = postfixes[post];
            postfix(post, ...((data.length) ? data : [data]));
        }

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

        prefix("[", 8, function() {
            var args = [];
            if (tokens[i].type !== "]") {
                args.push(expression(2));
                while (token().type === ",") {
                    advance();
                    args.push(expression(2));
                }
                let t = token();
                if (t.type !== "]") throw "Expected closing bracket ']'";
            } 
            advance();
            return {
                type: "call",
                args: args,
                name: "list"
            };
        });

        // macros are not parsed until evaluation
        prefix("macro", 9, (data) => data);

        prefix("(", 8, function() {
            let value = expression(2);
            if (token().type !== ")") throw "Expected closing parenthesis ')'";
            advance();
            return value;
        });

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


        var parseTree = [];
        while (token().type !== "(end)") {
            parseTree.push(expression(0));
        }
        return parseTree;
    }

    // maps operators to their corresponding functions
    const operators = {};

    /**
     * Add an infix operator which defaults to read-only.
     */
    function addInfixOperator(name, bp, fn, writable = false) {
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
    function addPrefixOperator(name, bp, fn, writable = false) {
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
    function addPostfixOperator(name, bp, fn, writable = false) {
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
    addPrefixOperator("!", 6.5, xen.not);
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
    addInfixOperator(">=", 2.80, xen.greaterThanOrEqual);

    addInfixOperator("<=", 2.80, xen.lessThanOrEqual);

    addInfixOperator("==", 2.70, xen.equal);
    addInfixOperator("!=", 2.70, xen.notEqual);

    addInfixOperator("&&", 2.65, xen.and);
    addInfixOperator("||", 2.60, xen.or);

    addPostfixOperator(";", 0.5, xen.__null);

    //  ********* EVALUATOR *********

    var args = {};

    function evaluate(parseTree) {
        xen.__break = false;
        xen.__return = undefined;

        var parseNode = function(node) {
            if (xen.__break || node == undefined) return;

            let result;

            if (node.type === "number") {
                result = node.value;
            } else if (operators[node.type]) {
                let fn = operators[node.type];
                let left = parseNode(node.left);
                let right = parseNode(node.right);
                let args = [left, right];
                //let args = (node.right && node.left)? [left, right] : [(left != undefined) ? left : right];

                result = call(fn, args, "", node.type);
            } else if (node.type === "identifier") {
                var value = args.hasOwnProperty(node.value) ? args[node.value] : xen[node.value];
                if (typeof value === "undefined") throw node.value + " is undefined";
                if (value instanceof Function && !xen.__functionsAsData) throw new SyntaxError(`Missing parentheses in call to ${node.value}()`);
                result = value;
            } else if (node.type === "assign") {
                xen[node.name] = parseNode(node.value);
            } else if (node.type === "call") {
                let args = node.args.map(parseNode);
                let fn = xen[node.name];
                if (!(fn instanceof Function)) throw node.name + "() is undefined";

                result = call(fn, args, node.name);

            } else if (node.type === "function") {
                xen[node.name] = function() {
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
                if (fn != undefined) return fn(value.pre, value.block);
            }
            xen.__break = false;
            //console.log("unbreaking");
            return result;
        };
        //console.log("Evaling tree:",parseTree);
        // eval the parseTree, returning all vals in an array of value-type pairs
        let output = parseTree.map((node) => {
            var value = parseNode(node);
            if (typeof value !== "undefined") {
                let type = displayType(value);
                // store answer
                xen.ans = value;
                if (typeof value == 'symbol') return {value: value.description, type};
                else return {value, type};
            }
        });
        if (xen.__return != undefined) return [{value: xen.__return, type: displayType(xen.__return)}];
        else return output;
    }


    function call(fn, args, fnName, operator) {
        if (args.some(isPartiallyEvaluated)) {
            if (fn.__refuseFunctionalInput) {
                return partialFunction(fn, args, fnName, operator)
            } else {
                // if functional, try to evaluate first
                try { return fn(...args); }
                catch { return partialFunction(fn, args, fnName, operator); }
            }
        } else {
            return fn(...args);
        }
    }

    function partialFunction(fn, args, name = fn.name, operator) {

        let f = function(...givenArgs) {
            let argsCopy = args.slice(0);
            for (let i = 0, j = 0; i < argsCopy.length; i++) {
                if (givenArgs[j] == undefined) break;
                if (argsCopy[i] == xen["..."]) {
                    // fill the hole directly
                    argsCopy[i] = givenArgs[j++];
                } else if (argsCopy[i] && argsCopy[i].partialArgs) {
                    // fill the function's holes as much as possible
                    let n = argsCopy[i].partialArgs;
                    let innerArgs = givenArgs.slice(j, j + n);
                    argsCopy[i] = argsCopy[i](...innerArgs);
                    j += n;
                }
            }
            return call(fn, argsCopy, name, operator)
        };
        // total all the number of ... in the given arguments
        f.partialArgs = args.reduce((total, e) => numPartialArgs(e) + total, 0);
        if (operator) {
            let displayString;

            if (args[0] == undefined) {
                displayString = `(${operator}${displayPartial(args[1])})`;
            } else if (args[1] == undefined) {
                displayString = `(${displayPartial(args[0])} ${operator})`;
            } else {
                displayString = `(${displayPartial(args[0])} ${operator} ${displayPartial(args[1])})`;
            }
            f.toString = () => displayString;
        } else {
            f.toString = () => `${name}(${args.map(displayPartial)})`;
        }

        return f;
    }

    function isPartiallyEvaluated(expr) {
        if (expr) {
            return expr == xen["..."] || !!expr.partialArgs;
        } else {
            return false;
        }
    }

    function numPartialArgs(expr) {
        if (expr == xen["..."]) return 1;
        else if (expr) return expr.partialArgs || 0;
        else return 0;
    }

    function displayPartial(expr) {
        return (expr == xen["..."])? "..." : (expr || "");
    }

    // stores all available macros
    const macros = {};

    xen.macros = macros;

    // js evaluates the block as JavaScript
    macros.js = function(pre, block) {
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
            return executeBlock(xen, evaluate);
        } catch(e) {
            throw "Error Running JavaScript.\n" + e;
        }
    };

    macros["@"] = undefined; // do nothing (comment)

    macros.scl = function(pre, content) {
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
        }    // option to return all the info
        if (pre == "*") return { description, notesPerOctave, scale };

        return scale;
    };

    macros.function = function(pre, content) {
            let preReg = /^(?<id>\w*)\((?<args>[\w\s,]*)\)$/;
            let match = pre.match(preReg);
            if (!match) throw new SyntaxError("Incorrect function syntax.");
            let fnName = match.groups.id;
            let argNames = match.groups.args.split(",").map(e => e.trim());
            let temps = {};
            
            // REDO this PART
            let fn = function(...args) {
                /* store arguments as temp variables */
                for (let i = 0; i < argNames.length; i++) {
                    let name = argNames[i];
                    temps[name] = xen[name];
                    xen[name] = args[i];
                }
                let result = xen.xen_eval(content);
                /* bring back original variables */
                for (let i = 0; i < argNames.length; i++) {
                    let name = argNames[i];
                    xen[name] = temps[name];
                }
                
                return result;
            };
            fn.toString = () => `${fnName}(${argNames})`;
            
            xen[fnName] = fn;
            return fn;
    };

    // macro defines a new type of block 
    //     M E T A
    macros.macro = function(name, blockDefinition) {
        //if (!name) throw new SyntaxError(`Block definitions must be given a name.`);
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
            macros[name] = generateBlockFn(xen, evaluate);
        } catch(e) {
            throw "Error Running JavaScript.\n" + e;
        }
    };

    macros.operator = function(pre, content) {
        /* 
        formats:  a op b  bp?
                    op b  bp?
                  a op    bp?

        optional parens around the expression
        (no space needed between op and a, b)
        */
        // all operator symbols except parens 
        let preReg = /(\(\s*)?(?<a>\w+)?\s*(?<op>[+\-*\/\^%=,:;\<>&|!#~]+)\s*(?<b>\w+)?(\s*\))?(\s+(?<bp>[\d\.]+))?/;
        let match = pre.match(preReg);
        if (!match) throw new SyntaxError("Incorrect operator syntax.");
        let a = match.groups.a;
        let b = match.groups.b;
        let op = match.groups.op;
        let bp = parseFloat(match.groups.bp);

        let generateFunction = new Function("xen", "args", "argName1", "argName2",
        `// all variables undeclared or declared with 'var' will be added to xen
    function storeVars(target) {
        return new Proxy(target, {
            has(target, prop) { 
                return prop.substring(0,7) != "argName"; 
            },
            get(target, prop) { 
                // function scope, local scope, then global scope
                if (prop in args)   return args[prop];
                if (prop in target) return target[prop];
                return window[prop];
            }
        });
    }

    with(storeVars(xen)) {
        return function (...___args___) {
            ${(a && b) ? 
            `let ${a} = ___args___[0]; 
            let ${b} = ___args___[1];` :
            `let ${a || b} = ___args___[0];`}
            ${content};
        }
    }`);

        let fn = generateFunction(xen, evaluate, a, b);

        if (!a && !b) throw new SyntaxError("Incorrect operator syntax.");
        else if (!a) addPrefixOperator(op, bp, fn, true);
        else if (!b) addPostfixOperator(op, bp, fn, true);
        else         addInfixOperator(op, bp, fn, true);
    };

    macros.return = function(pre) {
        let result = xen.xen_eval(pre);
        xen.__return = result;
        xen.__break = true;
        //console.log("breaking");
        return result;
    };

    macros.break = function() {
        xen.__break = true;
    };

    //  ********* LEXER *********

    function lex(input) {
        var isOperator = function(c) {
                return /[+\-*\/\^%=(),:;\<>&|\[\]!#~]/.test(c);
            },
            isDigit = function(c) {
                return /[0-9]/.test(c);
            },
            isWhiteSpace = function(c) {
                return /\s/.test(c);
            },
            isIdentifier = function(c) {
                return typeof c === "string" && !isOperator(c) && !isDigit(c) && !isWhiteSpace(c); /* && !isMacro(c); */
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
                let op = c;
                while (isOperator(advance())) op += c;
                    
                if (op.slice(0,2) == "//") { // comment
                    while (advance() != "\n" && c != undefined) /* do nothing */;
                } else if (op in operators) {
                    addToken(op);
                } else {
                    // if no match add them seperately
                    for (let char of op) addToken(char);
                }
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
                while (isIdentifier(advance()) || isDigit(c)) idn += c;

                // catch the reserved macros
                if (idn in macros) {
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
                    pre = pre.trim();
                    pre = pre.replace(/;+$/, "");
                    block = block.trim();

                    addToken("macro", {macroId: idn, pre, block});
                } else if (idn.toLowerCase() == "c")  addToken("c");
                else if (idn.toLowerCase() == "hz")   addToken("hz");
                else addToken("identifier", idn);
            } else {
                throw "Unrecognized token.";
            }
        }
        addToken("(end)");
        return tokens;
    }

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
     */

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
    }
    const external = {
        "evaluate": calculate, 
        "playback": function(freqs) { throw "play() is not supported in this implementation."; },
        "print": function(freqs) { throw "print() is not supported in this implementation."; },
    };

    xen.print = (...args) => {
        // convert to value/type pairs
        args = args.map(value => ({value, type: displayType(value)}));
        external.print(...args);
    };

    xen.xen_eval = (str) => {
        let results = external.evaluate(str);
        results = results.filter(e => e != undefined);
        if (results.length) return results[results.length-1].value;
    };

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

    xen.ans = undefined;
    xen.__functionsAsData = false;

    return external;

})));
