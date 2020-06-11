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

export const prefixes = {};
export const infixes = {};
export const postfixes = {};

//  ********* PARSER *********

export default function parse(tokens) {
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

    postfix("[", 8, function(left) {
        let idx = expression(2);
        if (token().type !== "]") throw "Expected closing bracket ']'";
        advance();
        return {
            type: "call",
            args: [left, idx],
            name: "getIndex"
        };
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
};