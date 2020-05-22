/**
 * xen.test.js
 * 
 * Contains all tests/examples for xen language
 * 
 * Member functions of `tests` run tests for certain functions
 * 
 * Examples are automatically generated and added to `examples` object
 * 
 * Copyright 2020 Stephen Karuksa
 */

const evaluate = xen.evaluate;
let numTests = 0;
const examples = {};


/**
 * An object representing xen IO
 * 
 * @param { string } input input xen code
 * @param { Object } output output object with value and type fields
 */
function ExampleIO(input, output) {
    /**
     * Add as an example in a certain category with an optional comment
     * */
    this.addExample = function(category = "general", comment = "") {
        this.comment = comment;

        if (!examples[category]) examples[category] = [];
        examples[category].push(this);
    }
    this.input = input;
    this.output = output;
}

/**
 * Tests whether xen code produces an expected output.
 * 
 * @param {string} input input string in xen code
 * @param { string } expectVal expected output as a string
 * @param { string } expectType expected output xen type
 */
function xenTest(input, expectVal, expectType) {
    numTests++;
    let results;
    try {
        results = evaluate(input);
    } catch (e) {
        if (expectVal != 'error') throw "Encountered error: " + e;
        else return new ExampleIO(input, {value: e, type: "error"});
    }
    let output = results[results.length-1];
    if (output.type == 'number') output.value = tune.Util.round(output.value, 2);
    if ("" + output.value !== expectVal) throw `Test failed. Expect: ${expectVal}, actual: ${output.value}`;
    if (expectType && (output.type !== expectType)) throw `Type test failed. Expect: ${expectType}, actual: ${output.type}`;
    
    return new ExampleIO(input, output);
}

/**
 * A collection of tests for all xen functions. Running method `addExample(category, comment?)`
 * will add the input/output/comment to the set of examples for `category` if they match the expected values
 * 
 * Right now, nothing's done with the examples but it would be nice to display them somewhere.
 */
const tests = {
    add() {
        // binary
        xenTest("2#12+19#19", "14#12",  "et");
        xenTest("4#19+12#12", "23#19",  "et").addExample("add", "et's change to base of first argument");
        xenTest("5:4+0#12",  "3.86#12", "et").addExample("add");
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
        xenTest("261.63hz+#4","329.63hz","freq");
        xenTest("#4+261.63hz","329.63hz","freq");
        xenTest("261.63hz+4","error").addExample("add");
        xenTest("4+261.63hz","error");
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
        xenTest("2#12-19#19", "-10#12", "et").addExample("subtract","et's change to base of first argument");
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
        xenTest("329.63hz-#4","261.63hz", "freq");
        xenTest("329.63hz-4","error");
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

        xenTest("inverse(100hz)",   "error").addExample("inverse","no negative frequencies allowed");
        xenTest("inverse('(5:4, 2c, 3#12))", "'(4:5,-2c,-3#12)", "list");
    },
    multiply() {
        xenTest("2#12*19#19", "error").addExample("multiply","cannot multiply two xen objects together");
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
    },
    mod() {
        xenTest("12#12%19#19", "0#12", "et");
        xenTest("38#19%12#12", "0#19", "et");
        xenTest("6#12%13#13",  "6#12", "et");
        xenTest("9:1 % #12",   "9:8",  "ratio");
        xenTest("2:1%3:2",     "4:3",  "ratio");
        xenTest("5:4%4:5",     "1:1",  "ratio");
        xenTest("12#12%5:4", "0.41#12","et");
        xenTest("5#12%200c",  "1#12",  "et");
        xenTest("300c%2#12", "100c",   "cents");
        xenTest("10c%4c",     "2c",    "cents");
        xenTest("1200c%5:4",  "41.06c","cents");
        xenTest("2:1%100c",    "1:1",  "ratio");
        xenTest("100hz%40hz",  "20hz", "freq");

        // frequency values cannot be combined to make a ratio
        xenTest("5:4%100hz",   "error");
        xenTest("500hz%5:4",   "error");
        xenTest("261.63hz%100c","error");
        xenTest("400c%261.63hz","error");

        xenTest("200hz % 4",   "error");
        xenTest("4 % 200hz",   "error");
        xenTest("200hz % -4",  "error");
        xenTest("-4 % 200hz",  "error");

        xenTest("#4 % 4",      "error");
        xenTest("4 % #4",      "error");
        xenTest("4#19 % 2",    "error");
        xenTest("2 % 3#19",    "error");

        xenTest("9:4 % 2",     "error");
        xenTest("2 % 3:2",     "error");

        xenTest("400c%4",    "error");
        xenTest("4%400c",    "error");

        // list mapping
        xenTest("4%'(1, 3, 5)", "'(0,1,4)", "list");
        xenTest("'(4, 9, 11)%4", "'(0,1,3)", "list");

        // elementwise list operation
        xenTest("'(5, 8, 19) % '(1, 3, 3)", "'(0,2,1)", "list");
        xenTest("'(1, 2, 3) % '(2, 4)", "error");
    },
    ratio() {
        //// ratio() function
        xenTest("ratio(12#12)", "2:1", "ratio");
        xenTest("ratio(100hz)", "error");
        xenTest("ratio(0c)",    "1:1", "ratio");
        xenTest("ratio(5:4)",   "5:4", "ratio");
        xenTest("ratio(2)",     "2:1", "ratio");

        xenTest("ratio(8,6)",   "8:6",  "ratio");
        xenTest("ratio(0,6)",   "error");
        xenTest("ratio(4,0)",   "error");
        xenTest("ratio(-2,5)",  "error");
        xenTest("ratio(2,-5)",  "error");

        // if 2 args, both args must be numbers
        xenTest("ratio(8:5,6)", "error");
        xenTest("ratio(#12,6)", "error");
        xenTest("ratio(10hz,6)","error");
        xenTest("ratio(100c,6)","error");
        xenTest("ratio(3,8:5)", "error");
        xenTest("ratio(3,#12)", "error");
        xenTest("ratio(3,10hz)","error");
        xenTest("ratio(3,100c)","error");

        // list mapping
        xenTest("ratio('(1, 3, 5),2)", "'(1:2,3:2,5:2)", "list");
        xenTest("ratio(5,'(2, 4, 6))", "'(5:2,5:4,5:6)", "list");

        // elementwise list operation
        xenTest("ratio('(1, 3, 5),'(2, 4, 6))", "'(1:2,3:4,5:6)", "list");
        xenTest("ratio('(1, 3, 5),'(4, 6))", "error");
    },
    colon() {
        //// colon operator
        xenTest("8:6",       "8:6", "ratio");
        xenTest("0:6",       "error");
        xenTest("4:0",       "error");
        xenTest("4:-1",      "error");

        // both args must be numbers
        xenTest("8:(6#12)",  "error");
        xenTest("8#12:6",    "error");
        xenTest("(8#12):6",  "error");
        xenTest("5hz:4",     "error");
        xenTest("5:(4hz)",   "error");
        xenTest("5c:4",      "error");
        xenTest("5:(4c)",    "error");

        // high operator precedence means conversion after ratio construction
        xenTest("5:4hz",     "error"); // can't go freq <-> ratio
        xenTest("#8:6",      "4.98#12", "et");
        xenTest("8:6#12",    "4.98#12", "et");
        xenTest("5:4c",      "386.31c", "cents");


        // unary prefix operator precedence greater than c and hz but less than binary : and #
        xenTest(":69hz",   "error");
        xenTest(":2c",     "1200c", "cents");// (:2)c
        xenTest(":5:4",    "5:4", "ratio"); // :(5:4)
        xenTest(":19#19",  "2:1"); // :(19#19)

        // compound ratio shorthand
        xenTest("4:5:6:7", "'(5:4,6:4,7:4)", "list");
        xenTest("4:(5:6)", "error");
        
        // list mapping
        xenTest("'(4,5,7):6","'(4:6,5:6,7:6)", "list");
        xenTest("6:'(4,5,7)","'(6:4,6:5,6:7)", "list");

        // elementwise list operation
        xenTest("'(1, 3, 5):'(2, 4, 6)", "'(1:2,3:4,5:6)", "list");
        xenTest("'(1, 3, 5):'(4, 6)", "error");
    },
    et() {
        //// et() function
        xenTest("et(12#12)",   "12#12", "et");
        xenTest("et(261.63hz)","60#12", "et");
        xenTest("et(200c)",    "2#12",  "et");
        xenTest("et(5:4)",     "3.86#12", "et");
        xenTest("et(4)",       "4#12",   "et");

        // 2 arg constructor specifying ET base
        xenTest("et(8,19)",    "8#19",  "et");
        xenTest("et(8,-4)",    "error");
        xenTest("et(8,0)",    "error");
        xenTest("et(12#12,19)","19#19", "et");
        xenTest("et(261.63hz,19)","95#19", "et");
        xenTest("et(200c, 6)",  "1#6",  "et");
        xenTest("et(5:4,19)",  "6.12#19", "et");
        xenTest("et(4)",       "4#12",   "et");

        // if 2 args, second arg must be a number
        xenTest("et(19,261.63hz)","error");
        xenTest("et(19,100c)",  "error");
        xenTest("et(19,4:3)",   "error");
        xenTest("et(19,#4)",    "error");

        // 3 arg constructor
        xenTest("et(8,19,2:1)",  "8#19",  "et");
        xenTest("et(1,13,3:1)",  "1#8.2", "et");
        xenTest("et(1,13,#(3:1))","1#8.2", "et");
        xenTest("et(4,12,2400c)","4#6",   "et");
        xenTest("et(4,12,100hz)","4#12",   "et"); // non-intervals have no effect
        xenTest("et(4,12,100)",  "4#12",   "et"); // non-intervals have no effect


        // list mapping
        xenTest("et('(1, 3, 5),19)", "'(1#19,3#19,5#19)", "list");
        xenTest("et(5,'(12, 19, 22))", "'(5#12,5#19,5#22)", "list");

        // elementwise list operation
        xenTest("et('(4, 6, 10),'(12, 19, 31))", "'(4#12,6#19,10#31)", "list");
        xenTest("et('(1, 3, 5),'(4, 6))", "error");
    },
    hash() {
        //// hash operator
        xenTest("19#19#12",   "12#12", "et");
        xenTest("261.63hz#12","60#12", "et");
        xenTest("200c#12",    "2#12",  "et");
        xenTest("5:4#12",     "3.86#12", "et");
        xenTest("4#12",       "4#12",   "et");

        // 2 arg constructor specifying ET base
        xenTest("8#19",    "8#19",  "et");
        xenTest("8#-4",    "error");
        xenTest("8#0",    "error");

        // infix operator precedence greater than c and hz but less than :
        xenTest("69#12hz", "440hz", "freq"); // (69#12)hz
        xenTest("12#12c",  "1200c", "cents"); // (12#12)c
        xenTest("19#4:3",   "error"); // 19#(4:3)
        xenTest("19##4",    "error"); // 19#(#4)

        // unary prefix operator precedence greater than c and hz but less than binary : and #
        xenTest("#69hz",   "440hz", "freq");  // (#69)hz
        xenTest("#10c",   "1000c");// (#10)c
        xenTest("#5:4",    "3.86#12", "et"); // #(5:4)
        xenTest("#19#19",  "12#12"); // #(19#19)

        // list mapping
        xenTest("'(1, 3, 5)#19", "'(1#19,3#19,5#19)", "list");
        xenTest("5#'(12, 19, 22)", "'(5#12,5#19,5#22)", "list");

        // elementwise list operation
        xenTest("'(4, 6, 10)#'(12, 19, 31)", "'(4#12,6#19,10#31)", "list");
        xenTest("'(1, 3, 5)#'(4, 6)", "error");
        xenTest("#'(12, 19, 31)", "'(12#12,19#12,31#12)", "list");
    },
    freq() {
        //// freq() function
        xenTest("freq(69#12)",   "440hz", "freq");
        xenTest("freq(100hz)",   "100hz", "freq");
        xenTest("freq(6900c)",   "440hz",  "freq");
        xenTest("freq(5:4)",     "error").addExample("freq", "ratios cannot be converted to frequencies");
        xenTest("freq(400)",     "400hz",   "freq");
        xenTest("freq(0)",       "error");
        xenTest("freq(-5)",      "error");

        // list mapping
        xenTest("freq('(#69, 300, 10hz))", "'(440hz,300hz,10hz)", "list");
    },
    hz() {
        //// hz operator precedence less than # and :
        xenTest("69#12 hz",   "440hz", "freq");
        xenTest("#69 hz",     "440hz", "freq");
        xenTest("100hz hz",   "100hz", "freq");
        xenTest("6900c hz",   "440hz",  "freq");
        xenTest("5:4 hz",     "error").addExample("freq", "ratios cannot be converted to frequencies");
        xenTest("400 hz",     "400hz",   "freq");
        xenTest("0 hz",       "error");
        xenTest("-5 hz",      "error");

        xenTest("400 Hz",     "400hz",   "freq").addExample("freq", "hz operator is case-insensitive");
        xenTest("400 HZ",     "400hz",   "freq");
        xenTest("400 hZ",     "400hz",   "freq");

        // list mapping
        xenTest("'(#69, 300, 10hz)hz", "'(440hz,300hz,10hz)", "list");
    },
    cents() {
        //// cents() function
        xenTest("cents(69#12)",   "6900c", "cents");
        xenTest("cents(440hz)",   "6900c", "cents");
        xenTest("cents(6900c)",   "6900c", "cents");
        xenTest("cents(5:4)",     "386.31c","cents");
        xenTest("cents(400)",     "400c",  "cents");
        xenTest("cents(0)",       "0c",    "cents");
        xenTest("cents(-5)",      "-5c",   "cents");

        // list mapping
        xenTest("cents('(#69, 440hz, 6900))", "'(6900c,6900c,6900c)", "list");
    },
    c() {
        //// c operator precedence less than # and :
        xenTest("69#12 c",   "6900c", "cents");
        xenTest("#69 c",     "6900c", "cents");
        xenTest("440hz c",   "6900c", "cents");
        xenTest("6900c c",   "6900c",  "cents");
        xenTest("5:4 c",     "386.31c","cents");
        xenTest("400 c",     "400c",   "cents");
        xenTest("0 c",       "0c",    "cents");
        xenTest("-5 c",      "-5c",   "cents");

        xenTest("400 C",     "400c",  "cents").addExample("cents", "c operator is case-insensitive");

        // list mapping
        xenTest("'(#69, 440hz, 6900) c", "'(6900c,6900c,6900c)", "list");
    },
    js() {
        
        xenTest(
            `js {
                a = 440;
                sum = function(li) {
                    let total = li[0];
                    for (let i = 1; i < li.length; i++) {
                        total = add(total, li[i]);
                    }
                    return total;
                }
                return 56;
            }`, "56", "number");
        xenTest("a", "440");
        xenTest("sum(#'(4, 5, 6, 7))", "22#12", "et");
        xenTest("sum('(4, 5, 6, 7))",  "22", "number");
    }
}

function test() {
    tests.add();
    tests.number();
    tests.subtract();
    tests.inverse();
    tests.multiply();
    tests.divide();
    tests.mod();
    tests.ratio();
    tests.colon();
    tests.et();
    tests.hash();
    tests.freq();
    tests.hz();
    tests.cents();
    tests.c();
    tests.js();

    //console.log(examples);

    console.log(`All ${numTests} tests passed!`);
}
test();