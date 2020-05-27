import { assertDefined, givenVals, displayType, isInterval } from "../helpers";
import { mapList, elementWise } from "../list-helpers";
import { XenList, Cents } from "../types";
import xen from "../constants";

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
}

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