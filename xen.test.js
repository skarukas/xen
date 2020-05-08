import xen from "./xen.js";
const evaluate = xen.evaluate;

let total = 0;

function xenTest(input, expectVal, expectType) {
    total++;
    let results;
    try {
        results = evaluate(input);
    } catch (e) {
        if (expectVal != 'error') throw "Encountered error: " + e;
        else return;
    }
    let result = results[results.length-1];
    if (result.type == 'number') result.value = tune.Util.round(result.value, 2);
    if ("" + result.value !== expectVal) throw `Test failed. Expect: ${expectVal}, actual: ${result.value}`;
    if (expectType && (result.type !== expectType)) throw `Type test failed. Expect: ${expectType}, actual: ${result.type}`;
}

const tests = {
    add() {
        // binary
        xenTest("2#12+19#19", "14#12",  "et");
        xenTest("4#19+12#12", "23#19",  "et");
        xenTest("5:4+0#12",  "3.86#12", "et");
        xenTest("0#12+5:4",  "3.86#12", "et");
        xenTest("2#12+200c", "4#12",    "et");
        xenTest("200c+2#12", "4#12",    "et");

        xenTest("5:4+3:2",   "15:8",    "ratio");
        
        xenTest("200c+4c",   "204c",    "cents");
        xenTest("200c+5:4",  "586.31c", "cents");
        xenTest("5:4+200c",  "586.31c", "cents");
        
        xenTest("100hz+50hz","150hz",   "freq");
        xenTest("5:4+100hz", "125hz",   "freq");
        xenTest("100hz+5:4", "125hz",   "freq");
        xenTest("261.63hz+4","329.63hz","freq");
        xenTest("4+261.63hz","329.63hz","freq");
        xenTest("261.63hz+400c","329.63hz","freq");
        xenTest("400c+261.63hz","329.63hz","freq");

        // unary
        xenTest("+100",     "100",    "number");
        xenTest("+-100",    "-100",   "number");
        xenTest("+19#19",   "12",     "number");
        xenTest("+4#12",    "4",      "number");
        xenTest("+5:4",     "1.25",   "number");
        xenTest("+115c",    "115",    "number");
        xenTest("+100hz",   "100",    "number");

        // list mapping
        xenTest("4+'(1, 2, 3)", "'(5,6,7)", "list");
        xenTest("'(1, 2, 3)+4", "'(5,6,7)", "list");
        xenTest("+'(1hz, 2c, 3#12)", "'(1,2,3)", "list");

        // elementwise list operation
        xenTest("'(1, 2, 3) + '(2, 4, 6)", "'(3,6,9)", "list");
        xenTest("'(1, 2, 3) + '(2, 4)", "error");
    },
    subtract() {
        // binary
        xenTest("2#12-19#19", "-10#12", "et");
        xenTest("4#19-12#12", "-15#19", "et");
        xenTest("5:4-0#12",  "3.86#12", "et");
        xenTest("0#12-5:4",  "-3.86#12","et");
        xenTest("2#12-200c", "0#12",    "et");
        xenTest("200c-2#12", "0#12",    "et");

        xenTest("3:2-5:4",   "6:5",     "ratio");
        
        xenTest("200c-4c",   "196c",    "cents");
        xenTest("200c-4:5",  "586.31c", "cents");
        xenTest("5:4-300c",  "86.31c",  "cents");
        
        xenTest("100hz-50hz","50hz",   "freq");
        xenTest("100hz-4:5", "125hz",   "freq");
        xenTest("329.63hz-4","261.63hz", "freq");
        xenTest("329.63hz-400c","261.63hz", "freq");
        // can't subtract freq from other types
        xenTest("5:4-100hz", "error");
        xenTest("4-261.63hz","error");
        xenTest("400c-261.63hz","error");

        // unary
        xenTest("-100",     "-100",   "number");
        xenTest("--100",    "100",    "number");
        xenTest("-19#19",   "-19#19", "et");
        xenTest("-4#12",    "-4#12",  "et");
        xenTest("-5:4",     "4:5",    "ratio");
        xenTest("-115c",    "-115c",  "cents");
        // no negative frequencies allowed
        xenTest("-100hz",   "error");

        // list mapping
        xenTest("4-'(1, 2, 3)", "'(3,2,1)", "list");
        xenTest("'(1, 2, 3)-4", "'(-3,-2,-1)", "list");
        xenTest("-'(5:4, 2c, 3#12)", "'(4:5,-2c,-3#12)", "list");

        // elementwise list operation
        xenTest("'(2, 4, 6) - '(1, 2, 3)", "'(1,2,3)", "list");
        xenTest("'(1, 2, 3) - '(2, 4)", "error");
    },
    number() {
        // unary
        xenTest("number(100)",     "100",    "number");
        xenTest("number(-100)",    "-100",   "number");
        xenTest("number(19#19)",   "12",     "number");
        xenTest("number(4#12)",    "4",      "number");
        xenTest("number(5:4)",     "1.25",   "number");
        xenTest("number(115c)",    "115",    "number");
        xenTest("number(100hz)",   "100",    "number");

        // list mapping
        xenTest("number('(1hz, 5:4, 3#12,100c))", "'(1,1.25,3,100)", "list");
    },
    inverse() {
        // unary
        xenTest("inverse(100)",     "-100",   "number");
        xenTest("inverse(-100)",    "100",    "number");
        xenTest("inverse(19#19)",   "-19#19", "et");
        xenTest("inverse(4#12)",    "-4#12",  "et");
        xenTest("inverse(5:4)",     "4:5",    "ratio");
        xenTest("inverse(115c)",    "-115c",  "cents");
        // no negative frequencies allowed
        xenTest("inverse(100hz)",   "error");
        xenTest("inverse('(5:4, 2c, 3#12))", "'(4:5,-2c,-3#12)", "list");
    },
    multiply() {
        xenTest("2#12*19#19", "error");
        xenTest("4#19*12#12", "error");
        xenTest("5:4*0#12",   "error");
        xenTest("0#12*5:4",   "error");
        xenTest("2#12*200c",  "error");
        xenTest("200c*2#12",  "error");
        xenTest("5:4*3:2",    "error");
        xenTest("200c*4c",    "error");
        xenTest("200c*5:4",   "error");
        xenTest("5:4*200c",   "error");
        xenTest("100hz*50hz", "error");
        xenTest("5:4*100hz",  "error");
        xenTest("100hz*5:4",  "error");
        xenTest("261.63hz*400c","error");
        xenTest("400c*261.63hz","error");

        xenTest("200hz*4",   "800hz","freq");
        xenTest("4*200hz",   "800hz","freq");
        xenTest("200hz*-4",  "error");
        xenTest("-4*200hz",  "error");

        xenTest("#4*4",      "16#12","et");
        xenTest("4*#4",      "16#12","et");
        xenTest("3#19*2",    "6#19","et");
        xenTest("2*3#19",    "6#19","et");

        xenTest("3:2*2",     "9:4","ratio");
        xenTest("2*3:2",     "9:4","ratio");

        xenTest("400c*4",    "1600c","cents");
        xenTest("4*400c",    "1600c","cents");

        // list mapping
        xenTest("4*'(1, 2, 3)", "'(4,8,12)", "list");
        xenTest("'(1, 2, 3)*4", "'(4,8,12)", "list");

        // elementwise list operation
        xenTest("'(2, 4, 6) * '(1, 2, 3)", "'(2,8,18)", "list");
        xenTest("'(1, 2, 3) * '(2, 4)", "error");
    },
    divide() {
        xenTest("12#12/19#19", "1",    "number");
        xenTest("6#12/13#13",  "0.5",  "number");
        xenTest("2:1/#4",      "3",    "number");
        xenTest("9:4/3:2",     "2",    "number");
        xenTest("5:4/4:5",     "-1",   "number");
        xenTest("12#12/5:4",   "3.11", "number");
        xenTest("2#12/200c",   "1",    "number");
        xenTest("200c/2#12",   "1",    "number");
        xenTest("200c/4c",     "50",   "number");
        xenTest("1200c/5:4",   "3.11", "number");
        xenTest("2:1/200c",    "6",    "number");
        xenTest("100hz/50hz",  "2",    "number");

        // frequency values cannot be combined to make a ratio
        xenTest("5:4/100hz",   "error");
        xenTest("500hz/5:4",   "error");
        xenTest("261.63hz/100c","60",  "number");
        xenTest("400c/261.63hz","error");

        xenTest("200hz/4",   "50hz","freq");
        xenTest("4/200hz",   "error");
        xenTest("200hz/-4",  "error");
        xenTest("-4/200hz",  "error");

        xenTest("#4/4",      "1#12","et");
        xenTest("4/#4",      "error");
        xenTest("4#19/2",    "2#19","et");
        xenTest("2/3#19",    "error");

        xenTest("9:4/2",     "3:2","ratio");
        xenTest("2/3:2",     "error");

        xenTest("400c/4",    "100c","cents");
        xenTest("4/400c",    "error");

        // list mapping
        xenTest("4/'(1, 2, 4)", "'(4,2,1)", "list");
        xenTest("'(4, 8, 12)/4", "'(1,2,3)", "list");

        // elementwise list operation
        xenTest("'(2, 4, 6) / '(1, 2, 3)", "'(2,2,2)", "list");
        xenTest("'(1, 2, 3) / '(2, 4)", "error");

    }
}

function test() {
    tests.add();
    tests.number();
    tests.subtract();
    tests.inverse();
    tests.multiply();
    tests.divide();

    console.log(`All ${total} tests passed!`);
}
test();