//  ********* EVALUATOR *********
import operators from "./operators";
import macros from "./macros";
import xen from "./constants";
import { displayType } from "./helpers";

var args = {};

export default function evaluate(parseTree) {
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
            
            if (left == xen["..."]) {
                // partially evaluated expression
                result = function(_left) {
                    return fn(_left, right);
                }
                result.toString = () => `... ${node.type} ${right || ""}`;
            } else if (right == xen["..."]) {
                // partially evaluated expression
                result = function(_right) {
                    return fn(left, _right);
                }
                result.toString = () => `${left || ""} ${node.type} ...`;
            } else {
                // fully evaluated expression
                if (node.right && node.left) result = fn(left, right); // binary
                else result = fn(right || left); // unary
            }
        } else if (node.type === "identifier") {
            var value = args.hasOwnProperty(node.value) ? args[node.value] : xen[node.value];
            if (typeof value === "undefined") throw node.value + " is undefined";
            if (value instanceof Function && !xen.__functionsAsData) throw new SyntaxError(`Missing parentheses in call to ${node.value}()`);
            result = value;
        } else if (node.type === "assign") {
            xen[node.name] = parseNode(node.value);
        } else if (node.type === "call") {
            let args = [];
            let curried = false;
            for (var i = 0; i < node.args.length; i++) {
                args[i] = parseNode(node.args[i]);
                if (args[i] == xen["..."]) curried = true;
            }
            let fn = xen[node.name];
            if (typeof fn === 'undefined') throw node.name + "() is undefined";

            if (!curried) {
                // fully evaluated function
                result = fn(...args);
            } else {
                // partially evaluated function
                result = partialFunction(fn, args);

                function partialFunction(fn, args) {
                    let argsCopy = args.slice(0);

                    let f = function(...curriedArgs) {
                        for (let i = 0, j = 0; i < argsCopy.length; i++) {
                            if (argsCopy[i] == xen["..."]) {
                                if (curriedArgs[j]) argsCopy[i] = curriedArgs[j++];
                                else return partialFunction(fn, argsCopy);
                            }
                        }
                        return fn(...argsCopy);
                    }

                    f.toString = () => `${node.name}(${args.map(e => (typeof e == 'symbol')? e.description : e)})`;
                    return f;
                }
            }
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
};