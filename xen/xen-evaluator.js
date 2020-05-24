//  ********* EVALUATOR *********
import operators from "./operators";
import macros from "./macros";
import xen from "./constants";
import { displayType } from "./helpers";

var args = {};

export default function evaluate(parseTree) {
    xen.__return = undefined;

    var parseNode = function(node) {
        if (node.type === "number") {
            return node.value;
        } else if (operators[node.type]) {
            // : is the only operator that does not map lists by default (due to compound ratio expansions)
            let fn = operators[node.type];
            if (node.right && node.left) return fn(parseNode(node.left), parseNode(node.right)); // binary
            return fn(parseNode(node.right || node.left)); // unary
        } else if (node.type === "identifier") {
            var value = args.hasOwnProperty(node.value) ? args[node.value] : xen[node.value];
            if (typeof value === "undefined") throw node.value + " is undefined";
            if (value instanceof Function && !xen.__functionsAsData) throw new SyntaxError(`Missing parentheses in call to ${node.value}()`);
            return value;
        } else if (node.type === "assign") {
            xen[node.name] = parseNode(node.value);
        } else if (node.type === "call") {
            let args = [];
            for (var i = 0; i < node.args.length; i++) args[i] = parseNode(node.args[i]);
            let fn = xen[node.name];
            if (typeof fn === 'undefined') throw node.name + "() is undefined";
            return fn(...args);
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
            if (fn == undefined) return;
            return fn(value.pre, value.block);
        }
    };

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