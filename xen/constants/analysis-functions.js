import { assertDefined, givenVals, displayType, isInterval } from "../helpers";
import { mapList, elementWise } from "../list-helpers";
import xen from "../constants";

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

xen.approxpartials = function(...args) {
    // flatten args and convert to freq
    args = args.flat(Infinity).map((e) => xen.freq(e).freq); 
    // find best fit
    let result = tune.AdaptiveTuning.bestFitPartialsFromFreq(args);
    let f = xen.freq(result.fundamental);
    let arr = result.partials.map((e) => xen.ratio(e));
    let ratios = xen.list(...arr);
    return xen.list(f, ratios);
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
}

xen.smallest_consistent = function(limit) {
    if (limit >= 50) throw new RangeError(`This operation is too complex to be performed with the given value.
    ${givenVals(limit)}`);
    let edo = 0;
    while (!xen.consistent(limit, ++edo));
    return edo;
}