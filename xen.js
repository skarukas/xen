/**
 * 
 * xen : simple "programming language" for calculation of ratios
 * 
 * Modified version of "AEL" by Peter_Olson:
 * 
 * https://www.codeproject.com/Articles/345888/How-to-Write-a-Simple-Interpreter-in-JavaScript
 * 
 * integrated with my library `tune.js`
 * 
 */

//import tune from "./tune"; // defined globally already

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
    return tune.Util.round(this.freq, 2) + "Hz";
}
tune.ETInterval.prototype.toString = function() {
    return tune.Util.round(this.n, 2) + "#" + tune.Util.round(this.d, 2);
}

function isInterval(a) {
    let type = displayType(a);
    return type == "et" || type == "ratio" || type == "cents";
}

const xen = {};

xen.add = function(a, b) {
    try {
        if (b == undefined) {
            if (typeof a == "number") return a;
            else return a.asET();
        }

        // invert arguments for list map
        if (displayType(b) == 'list' && displayType(a) != 'list') return mapList(xen.add)(b, a);

        // both numbers, just add
        if (typeof a == "number" && typeof b == "number") return a + b;
        
        // at least one is not a number, do interval math
        if (typeof a == "number") a = tune.ETInterval(a);
        if (typeof b == "number") b = tune.ETInterval(b);

        if (displayType(b) == "freq" && isInterval(a)) return b.noteAbove(a);
        if (displayType(a) == "freq" && isInterval(b)) return a.noteAbove(b);
        if (displayType(a) == "freq" && displayType(b) == "freq") return tune.Frequency(a.freq + b.freq);
        return a.add(b);
    } catch (e) {
        throw new TypeError(`Ambiguous or incorrect call to +.
        ${givenVals(a, b)}`);
    }
}

xen.subtract = function(a, b) {
    if (b == undefined) {
        if (typeof a == "number") return -a;
        else if (displayType(a) == "freq") return tune.Frequency(-a.freq);
        else return a.inverse();
    }

    // both numbers, just subtract
    if (typeof a == "number" && typeof b == "number") return a - b;
    
    // at least one is not a number, do interval math
    if (typeof a == "number") a = tune.ETInterval(a);
    if (typeof b == "number") b = tune.ETInterval(b);
    if (displayType(a) == "freq" && displayType(b) == "freq") return tune.Frequency(a.freq - b.freq);
    if (displayType(a) == "freq" && isInterval(b))            return a.noteBelow(b);
    if (displayType(b) == "freq") throw new TypeError(`Cannot subtract a frequency from an interval.
    ${givenVals(a, b)}`);

    return a.subtract(b);
}

xen.multiply = function(a, b) {
    assertDefined(2, arguments);

    // invert arguments for list map
    if (displayType(b) == 'list' && displayType(a) != 'list') return mapList(xen.multiply)(b, a);
    
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
}

xen.divide = function(a, b) {
    assertDefined(2, arguments);

    // both numbers, just divide
    if (typeof a == "number" && typeof b == "number") return a / b;

    // at least one is not a number, do interval math
    if (isInterval(a) && typeof b == "number") return a.divide(b);
    if (isInterval(a) && isInterval(b)) return a.divideByInterval(b);
    if (displayType(a) == "freq" && typeof b == "number") return tune.Frequency(a.freq / b);
    else throw new TypeError(`Incompatible types for /.
    ${givenVals(a, b)}`);
}

xen.mod = function(a, b) {
    assertDefined(2, arguments);

    // both numbers, just mod
    if (typeof a == "number" && typeof b == "number") {
        return tune.Util.mod(a, b);
    }

    // at least one is not a number, do interval math
    if (typeof a == "number") a = tune.ETInterval(a);
    if (typeof b == "number") b = tune.ETInterval(b);

    return a.mod(b);
}

xen.pow = function(a, b) {
    assertDefined(2, arguments);

    // both numbers, return their power
    if (typeof a == "number" && typeof b == "number") return Math.pow(a, b);
    throw new TypeError(`Both arguments to ^ must be numbers.
    ${givenVals(a, b)}`);
}

xen.colon = function(a, b) {
    assertDefined(1, arguments);
    // creating compound ratios, e.g. 4:5:6:7:11
    if (typeof b == 'number' && displayType(a) == 'ratio') return new List(a.inverse(), tune.FreqRatio(b, a.n));
    if (typeof b == 'number' && displayType(a) == 'list')  return new List(...a, tune.FreqRatio(b, a[0].d));

    else return mapList(xen.ratio)(a, b);
}

xen.ratio = function(a, b) {
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
}

xen.et = function(a, b) {
    assertDefined(1, arguments);
    
    try {
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
}

xen.cents = function(a) {
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
}

xen.hertz = function(a) {
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
}

xen.number = function(a) {
    assertDefined(1, arguments);

    try {
        switch (displayType(a)) {
            case "number": return a;
            case 'et':     return a.asET().n;
            case 'cents':  return a.cents();
            case 'ratio':  throw "";
            case 'freq':   return a.freq;
            default:       throw "";
        }
    } catch (e) {
        throw new TypeError(`Unable to convert to number.
        ${givenVals(a)}`);
    }
}

xen.mtof = function(a) {
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
}

xen.ftom = function(a, b) {
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
}

xen.list = function(...args) {
    return new List(...args);
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

xen.play = function(...args) {
    let C = tune.Frequency(261.63); // default to middle C
    let baseFreq;
    let freqs = [];

    try {
        // convert all to freqs and add them
        processArgs(args);
        // call the audio-producing function
        external.playback(freqs);
    } catch (e) {
        throw e || new TypeError(`Ambiguous or incorrect call to play().
        ${givenVals(...args)}`);
    }

    function processArgs(arr) {
        let f;
        for (let arg of arr) {
            switch (displayType(arg)) {
                case 'list':   
                    processArgs(arg); // flatten the list
                    break;
                case 'et':
                    // if small, interpret as an interval
                    if (xen.hertz(arg).freq < 20) addRelative(arg);
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
            f = xen.hertz(arg);
            freqs.push(f.freq);
            baseFreq = baseFreq || f;
        }
        // interpret the value as an interval
        function addRelative(arg) {
            // C = default
            if (!baseFreq) {
                // if no base frequency, use C and play it back
                baseFreq = C;
                freqs.push(xen.hertz(C).freq);
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
    return (typeof data === 'undefined')? "undefined" : (typeMap[data.constructor.name] || "unknown type");
}

const typeMap = {
    "Number": "number",
    "ETInterval": "et",
    "FreqRatio": "ratio",
    "Cents": "cents",
    "Frequency": "freq",
    "List": "list"
}


var variables = {
    ans: undefined,
    pi: Math.PI,
    e: Math.E,
    fifth: tune.JI.fifth,
    third: tune.JI.third,
    seventh: tune.JI.seventh,
    octave: tune.FreqRatio(2)
};

var functions = {
    // numeric functions
    sin: mapList(Math.sin),
    cos: mapList(Math.cos),
    tan: mapList(Math.cos),
    asin: mapList(Math.asin),
    acos: mapList(Math.acos),
    atan: mapList(Math.atan),
    abs: mapList(Math.abs),
    round: mapList(Math.round),
    ceil: mapList(Math.ceil),
    floor: mapList(Math.floor),
    log: mapList(Math.log),
    exp: mapList(Math.exp),
    sqrt: mapList(Math.sqrt),
    max: Math.max,
    min: Math.min,
    random: (n) => {
        if (!n) return Math.random();
        let result = new List();
        while (n-- > 0) result.push(Math.random());
        return result;
    },
    // xen constructors
    ratio: mapList(xen.ratio),
    et: mapList(xen.et),
    cents: mapList(xen.cents),
    freq: mapList(xen.hertz),
    number: mapList(xen.number),
    list: xen.list,
    "'": xen.list,
    // xen functions
    mtof: mapList(xen.mtof),
    ftom: mapList(xen.ftom),
    play: xen.play,
};

/**
 * Takes a function and turns it into a version that applies 
 * it to all elements if the first input is a list.
 */
function mapList(fn) {
    return function (first, ...args) {
        if (displayType(first) == 'list') {
            return first.map((e) => fn(e, ...args));
        } else {
            return fn(first, ...args);
        }
    }
}



//  ********* LEXER *********

var lex = function(input) {
    var isOperator = function(c) {
        return /[+\-*\/\^%=(),:\#]/.test(c);
        },
        isDigit = function(c) {
            return /[0-9]/.test(c);
        },
        isWhiteSpace = function(c) {
            return /\s/.test(c);
        },
        isIdentifier = function(c) {
            return typeof c === "string" && !isOperator(c) && !isDigit(c) && !isWhiteSpace(c);
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
        if (isWhiteSpace(c)) advance();
        else if (isOperator(c)) {
            addToken(c);
            advance();
        }
        else if (isDigit(c)) {
            var num = c;
            while (isDigit(advance())) num += c;
            if (c === ".") {
                do num += c;
                while (isDigit(advance()));
            }
            num = parseFloat(num);
            if (!isFinite(num)) throw "Number is too large or too small for a 64-bit double.";
            addToken("number", num);
        }
        else if (isIdentifier(c)) {
            var idn = c;
            while (isIdentifier(advance())) idn += c;

            // catch the postfix operators
            if (idn.toLowerCase() == "c")  addToken("c");
            else if (idn.toLowerCase() == "hz") addToken("hz");
            else addToken("identifier", idn);
        }
        else throw "Unrecognized token.";
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

    prefix("(", 8, function() {
        let value = expression(2);
        if (token().type !== ")") throw "Expected closing parenthesis ')'";
        advance();
        return value;
    });

    // interval operators
    infix(":", 7.5);
    infix("#", 7.5);
    //unary operators
    prefix("-", 7);
    prefix("+", 7);
    // postfix
    postfix("c", 6.5);
    postfix("hz", 6.5);

    infix("^", 6, 5);
    infix("*", 4);
    infix("/", 4);
    infix("%", 4);
    infix("+", 3);
    infix("-", 3);

    prefix(":", 2.5);
    prefix("#", 2.5);

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
};


//  ********* EVALUATOR *********

var evaluate = function(parseTree) {

    var operators = {
        "+": xen.add,
        "-": xen.subtract,
        "*": xen.multiply,
        "/": xen.divide,
        "%": xen.mod,
        "^": xen.pow,
        ":": xen.colon,
        "#": xen.et,
        "c": xen.cents,
        "hz": xen.hertz
    };

    var args = {};

    var parseNode = function(node) {
        if (node.type === "number") return node.value;
        else if (operators[node.type]) {
            // : is the only operator that does not map lists by default (due to compound ratio expansions)
            let fn = (node.type == ':')? operators[node.type] : mapList(operators[node.type]);
            if (node.right && node.left) return fn(parseNode(node.left), parseNode(node.right)); // binary
            return fn(parseNode(node.right || node.left)); // unary
        }
        else if (node.type === "identifier") {
            var value = args.hasOwnProperty(node.value) ? args[node.value] : variables[node.value];
            if (typeof value === "undefined") throw node.value + " is undefined";
            return value;
        }
        else if (node.type === "assign") {
            variables[node.name] = parseNode(node.value);
        }
        else if (node.type === "call") {
            for (var i = 0; i < node.args.length; i++) node.args[i] = parseNode(node.args[i]);
            let fn = functions[node.name];
            if (typeof fn === 'undefined') throw node.name + "() is undefined";
            return fn.apply(null, node.args);
        }
        else if (node.type === "function") {
            functions[node.name] = function() {
                for (var i = 0; i < node.args.length; i++) {
                    args[node.args[i].value] = arguments[i];
                }
                var ret = parseNode(node.value);
                args = {};
                return ret;
            };
        }
    };

    var output = "";
    for (var i = 0; i < parseTree.length; i++) {
        var value = parseNode(parseTree[i]);

        if (typeof value !== "undefined") {
            // store answer
            variables.ans = value;
            // add type annotations to result
            value += ` (${displayType(value)})`;
            output += value; 
        }
    }
    return output;
};
var calculate = function(input) {
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