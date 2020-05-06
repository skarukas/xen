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

//import tune from "./tune";

const xen = {};

xen.add = function(a, b) {
    if (b == undefined) {
        if (typeof a == "number") return a;
        else return a.asET();
    }

    // both numbers, just add
    if (typeof a == "number" && typeof b == "number") return a + b;
    
    // at least one is not a number, do interval math
    if (typeof a == "number") a = tune.ETInterval(a);
    if (typeof b == "number") b = tune.ETInterval(b);

    return a.add(b);
}

xen.subtract = function(a, b) {
    if (b == undefined) {
        if (typeof a == "number") return -a;
        else return a.inverse();
    }

    // both numbers, just subtract
    if (typeof a == "number" && typeof b == "number") return a - b;
    
    // at least one is not a number, do interval math
    if (typeof a == "number") a = tune.ETInterval(a);
    if (typeof b == "number") b = tune.ETInterval(b);

    return a.subtract(b);
}

xen.multiply = function(a, b) {
    // both numbers, just multiply
    if (typeof a == "number" && typeof b == "number") return a * b;

    // at least one is not a number, do interval math
    if (typeof a == "number" && typeof b != "number") {
        return b.multiply(a);
    } else if (typeof b == "number" && typeof a != "number") {
        return a.multiply(b);
    } else {
        throw "At least one argument to * must be a number."
    }
}

xen.divide = function(a, b) {
    // both numbers, just divide
    if (typeof a == "number" && typeof b == "number") return a / b;

    // at least one is not a number, do interval math
    if (typeof a != "number") {
        return (typeof b == "number")? a.divide(b) : a.divideByInterval(b);
    } else {
        throw "The second argument to / cannot be an interval if the first is a number."
    }
}

xen.mod = function(a, b) {
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
    // both numbers, return their power
    if (typeof a == "number" && typeof b == "number") return Math.pow(a, b);
    throw "Both arguments to ^ must be numbers."
}

xen.ratio = function(a, b) {
    // unary conversion operator
    if (b == undefined && typeof a !== "number") return a.asFrequency();

    // both numbers, create a freqratio
    if (typeof a == "number" && (typeof b == "number" || b == undefined)) return tune.FreqRatio(a, b);
    throw "Both arguments to ratio() (':' operator) must be numbers."
}

xen.et = function(a, b) {
    // conversion operator
    if (typeof a !== "number") return a.asET(b);

    // both numbers, create an etinterval
    if (typeof a == "number" && (typeof b == "number" || b == undefined)) return tune.ETInterval(a, b);
    throw "Both arguments to et() ('$' operator) must be numbers."
}

xen.cents = function(a) {
    if (typeof a == "number") return a * 100;
    else return a.cents();
}


var variables = {
    pi: Math.PI,
    e: Math.E,
    fifth: tune.JI.fifth,
    third: tune.JI.third,
    seventh: tune.JI.seventh,
    octave: tune.ETInterval(12)
};

var functions = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.cos,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    abs: Math.abs,
    round: Math.round,
    ceil: Math.ceil,
    floor: Math.floor,
    log: Math.log,
    exp: Math.exp,
    sqrt: Math.sqrt,
    max: Math.max,
    min: Math.min,
    random: Math.random,
    ratio: xen.ratio,
    et: xen.et,
    cents: xen.cents,
    // these are number -> number and should be changed if a `note` data type is created
    mtof: tune.Util.ETToFreq,
    ftom: tune.Util.freqToET,
};



//  ********* LEXER *********

var lex = function(input) {
    var isOperator = function(c) {
        return /[+\-*\/\^%=(),:\$]/.test(c);
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
            addToken("identifier", idn);
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
        //console.log("expression", rbp)
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
    infix("$", 7.5);
    //unary operators
    prefix("-", 7);
    prefix("+", 7);

    infix("^", 6, 5);
    infix("*", 4);
    infix("/", 4);
    infix("%", 4);
    infix("+", 3);
    infix("-", 3);

    prefix(":", 2.5);
    prefix("$", 2.5);

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
        ":": xen.ratio,
        "$": xen.et
    };

    var args = {};

    var parseNode = function(node) {
        if (node.type === "number") return node.value;
        else if (operators[node.type]) {
            if (node.left) return operators[node.type](parseNode(node.left), parseNode(node.right));
            return operators[node.type](parseNode(node.right));
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
            return functions[node.name].apply(null, node.args);
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
        if (typeof value !== "undefined") output += value;
    }
    return output;
};
var calculate = function(input) {
    var tokens = lex(input);
    var parseTree = parse(tokens);
    var output = evaluate(parseTree);
    return output;
};


export default calculate;