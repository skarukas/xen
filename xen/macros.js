import xen from "./constants";
import args from "./xen-evaluator";
import { addInfixOperator, addPostfixOperator, addPrefixOperator } from "./operators";

// stores all available macros
const macros = {};
export default macros;

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
        return executeBlock(xen, args);
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
    };
    // option to return all the info
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
        macros[name] = generateBlockFn(xen, args);
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

    let fn = generateFunction(xen, args, a, b);

    if (!a && !b) throw new SyntaxError("Incorrect operator syntax.");
    else if (!a) addPrefixOperator(op, bp, fn, true);
    else if (!b) addPostfixOperator(op, bp, fn, true);
    else         addInfixOperator(op, bp, fn, true);
}

macros.return = function(pre) {
    let result = xen.xen_eval(pre);
    xen.__return = result;
    xen.__break = true;
    //console.log("breaking");
    return result;
}

macros.break = function() {
    xen.__break = true;
}