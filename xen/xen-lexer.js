//  ********* LEXER *********
import operators from "./operators";
import macros from "./macros";

export default function lex(input) {
    var isOperator = function(c) {
            return /[+\-*\/\^%=(),:;\<>&|!#~]/.test(c);
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
};