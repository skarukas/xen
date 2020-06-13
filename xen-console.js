/* import xen from "./xen-rollup.js"; */
import playback from "./xen-webaudio-playback.js";
const evaluate = xen.evaluate;

const version = "2.0.0";
const resultFeed = document.getElementById("result");
const codeInput = document.getElementById("codeInput");
codeInput.placeholder=`xen v. ${version}: type 'help' for a brief introduction`;
codeInput.focus();

const helpString = 
`****** xen console v. ${version}, © 2020 stephen karukas ******
xen is a high-level, interpreted language for analyzing and operating upon 
musical pitch structures within the context of "xenharmonic" microtonal theory

xen contains 6 main data types, with special syntax to identify them:
 - et       4#12
 - ratio    9:8
 - freq     300hz
 - cents    40c
 - number   1.10
 - list    '(1, 2, 3, 4)

generally, math may be performed freely between all types
using arithmetic operators (+, -, *, /, %). xen handles the 
type conversions automatically behind the scenes.

n.b. most operators work in pitch space. for example, adding
intervals corresponds to "stacking" them, no matter if they
are frequency ratios or et (equal-tempered) intervals.

the function play() may be used to play back notes, intervals,
or even lists of intervals & interval structures such as 4:5:6:7.

xen also includes functions for analysis, such as closest(), which
finds the closest et intervals for a given ratio and the closest 
ratios for a given et interval.

see https://github.com/skarukas/xen/wiki for full documentation.

useful commands:
 - clear            clear the console
 - ans              a variable storing the previous answer
 - help *query*     search the wiki for info on "query" (e.g. 'help add' will search for 'add')
 - wiki *query*     same as 'help name'
`;
/* $('#code-container').hide("slide");
$('#code-container').height(0); */

var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/d");


// dark mode
$( ".dark-switch" ).on("click", function() {
    if( $( "body" ).hasClass( "dark-primary" )) {
      $( "body" ).removeClass( "dark-primary" );
      $( "#codeInput" ).removeClass( "dark-primary" );
      $( ".interactions" ).removeClass( "dark-primary" );
      $( ".cheat-sheet" ).removeClass( "dark-secondary" );
      $( "footer" ).removeClass( "dark-secondary" );
      $( ".dark-switch" ).text( "dark mode is off" );
      
      editor.setTheme("ace/theme/chrome");
    } else {
      $( "body" ).addClass( "dark-primary" );
      $( "#codeInput" ).addClass( "dark-primary" );
      $( ".interactions" ).addClass( "dark-primary" );
      $( ".cheat-sheet" ).addClass( "dark-secondary" );
      $( "footer" ).addClass( "dark-secondary" );
      $( ".dark-switch" ).text( "dark mode is on" );

      editor.setTheme("ace/theme/kr_theme");
    }
});

// cheat sheet hidden by default
let cheat = false;
$( ".cheat-toggle").on("click", function() {
    cheat = !cheat;
    if (cheat) {
        $(".cheat-sheet").show();
        $("#editor").width("60vw");
    } else {
        $(".cheat-sheet").hide();
        $("#editor").width("100vw");
    }
});

// definitions area shown by default
let definitions = true;
$( ".def-toggle").on("click", function() {
    definitions = !definitions;
    if (definitions) {
        $("#code-container")
            .show("slide")
            .height("100%");
        $(".def-toggle").text("hide definitions");
        $(".cheat-toggle").show();
    } else {
        $("#code-container")
            .hide("slide")
            .height("0px");
        $(".def-toggle").text("show definitions");
        $("#codeInput").focus()[0].scrollIntoView();
        $( ".cheat-toggle").hide();
    }
});

// cookie handling
function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (encodeURIComponent(value) || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) {
            let val = c.substring(nameEQ.length,c.length);
            return decodeURIComponent(val);
        }
    }
    return null;
}
function eraseCookie(name) {   
    document.cookie = name+'=; Max-Age=-99999999;';  
}

let code = getCookie("codecontent");
code && $('#definitions').val(code);

$('#definitions').on("keyup", (event) => {
    let val = event.target.value;
    setCookie("codecontent",val);
})


$(document).delegate('#definitions', 'keydown', function(e) {
    var keyCode = e.keyCode || e.which;
  
    if (keyCode == 9) {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
  
      // set textarea value to: text before caret + tab + text after caret
      $(this).val($(this).val().substring(0, start)
                  + "\t"
                  + $(this).val().substring(end));
  
      // put caret at right position again
      this.selectionStart =
      this.selectionEnd = start + 1;
    }
  });




/**
 * Show the help text in a `pre` element.
 */
function displayHelp() {
    const helpNode = document.createElement("pre");
    helpNode.className = "help";
    helpNode.textContent = helpString;
    resultFeed.appendChild(helpNode);
}

const pastInputs = [];
const futureInputs = [];

codeInput.onkeyup = (event) => {
    switch (event.keyCode) {
        case 13: // enter = evaluate
            evaluateXenExpr();
            break;
        case 38: // up arrow = past inputs
            let lastInput = pastInputs.pop();
            if (lastInput != undefined) {
                codeInput.value = lastInput;
                futureInputs.push(lastInput);
            }
            break; 
        case 40: // down arrow = future inputs
            let nextInput = futureInputs.pop();
            if (nextInput != undefined) {
                codeInput.value = nextInput;
                pastInputs.push(nextInput);
            }
            break; 
    }
};

/** 
 * Make a new div and add it to the result feed.
 * */
function appendNewDiv(className, text) {
    let result = document.createElement("div");
    result.className = className;
    result.innerText = text;
    resultFeed.appendChild(result);
}

/** 
 * Process the input and post the result.
 * */
function evaluateXenExpr() {
    playback.audioOn || playback.init();
    codeInput.placeholder = "";
    let inputExpr = codeInput.value;
    appendNewDiv("inputExpression", `> ${inputExpr}`);

    if (inputExpr == 'clear') resultFeed.innerHTML = "";
    else if (inputExpr == 'help') displayHelp();
    else {
        // evaluate xen code
        try {
            // convert the previous answer with prefix operator
            if (inputExpr == "#" || inputExpr == ":") inputExpr = inputExpr + " ans";
            // convert the previous answer with postfix operator
            else if (inputExpr.toLowerCase() == "c" || inputExpr.toLowerCase() == "hz") inputExpr = "ans " + inputExpr;
            // evaluate the current expression
            let allResults = evaluate(inputExpr);
            // display all returned values
            for (let result of allResults) {
                if (result) printToConsole(result);
            }
        } catch (e) {
            appendNewDiv("error", e);
        }
    }
    // reset input order
    while (futureInputs.length) pastInputs.push(futureInputs.pop());
    // add to stack if not empty string
    if (inputExpr) pastInputs.push(inputExpr);
    codeInput.value = "";
    codeInput.scrollIntoView();
}

function printToConsole(data) {
    appendNewDiv("output", `${data.value} (${data.type})`);
}
xen.print = printToConsole;

/* editor.setValue(
`// This section is for definitions (operators, macros, functions)
//   and is written in the xen language, with the exception of the
//   embedded JavaScript used for certain macros


// a bunch of ways to define a function
avg(x, y) = js {
    let sum = add(x, y);
    return divide(sum, 2);
}

// inline function
avg(x, y) = (x + y) / 2

// function with implicit return ()
function avg(x, y) {
    sum = x + y;
    sum / 2
}

avg = function (x, y) {
    sum = x + y;
    sum / 2
}

// This function is defined within a block of JS code.
// Because 'avg' is not declared with let or const,
//    it becomes available in the global xen scope. 
//    N.B. though this seems contrary to JS 
//    best practices, this does not have negative side effects
//    in the context of xen code, as each JS block is executed
//    within its own scope.
js {
    avg = function(x, y) {
        let sum = x + y;
        return sum / 2;
    }
}

// Operators are defined by first presenting a template of the operation 
//    (and optionally a number representing its binding power)
//    and then a block of JavaScript code that defines the behavior
//    of the operator.

// defining a shorthand to play back the previous musical expression
//  (e.g. 5:4~)
operator (expr~) 1 {
    play(expr);
    return expr;
}

// defining an operator that returns a list of numbers in a certain range
// (e.g. 1->9 evaluates to 1, 2, 3, 4, 5, 6, 7, 8, 9)
operator (n -> m) 9 { 
    let result = []; 
    if (n < m) while (n <= m) result.push(n++); 
    else while (n >= m) result.push(n--); 
    return result; 
}

__functionsAsData = true

// defining a "pipe" operator that allows 
//     functions to be easily chained
operator (a >> b) { 
    return b(a);
}


// pipe operator in use.
// notice also the partially evaluated expressions (using ellipses).
//    this syntax defines an anonymous function that is immediately called
//    with its input.
b = 5:4
    >> (... * 2)
    >> cents 
    >> (400c - ...);

`); */

// run the code again -- BUT need new execution context / reset state 
editor.session.on('change', function(delta) {
    // delta.start, delta.end, delta.lines, delta.action
});

evaluate(
`// defining JSnext pipe operator

__functionsAsData = true;

operator (a >> b) { 
    return b(a);
}`);

evaluate(`
q = 5:4 >> cents;`);

evaluate(`
b = 5:4
    >> (... * 2)
    >> cents 
    >> (400c - ...);
`);

evaluate(`
operator (n -> m) 9 { 
    return range(n, m);
}`);

evaluate(`
function a(x) { 
    return 0
    return a(x-1)
}`)

evaluate(`
function g(x) {
    45;
    function q(y) {
        return y + 5;
    };
    return;
    return q(x);
    return q(x + 4);
}
`)

// searches the wiki for the given phrase
evaluate(`
macro help {
    let url = \`https://github.com/skarukas/xen/search?q=\${encodeURIComponent(pre)}&type=Wikis\`;
    window.open(url, "_blank");
}`);

// clone of help
evaluate(`
macro wiki {
    let url = \`https://github.com/skarukas/xen/search?q=\${encodeURIComponent(pre)}&type=Wikis\`;
    window.open(url, "_blank");
}`);

evaluate(`
macro for {
    /* no need for parens bb */
    if (pre[0] == "(" && pre[pre.length-1] == ")") pre = pre.substring(1, pre.length-1);
    let [varName, op, ...xenCode] = pre.split(" ");
    let iterable = xen_eval(xenCode.join(" "));
    
    let temp = xen_variables[varName];
    for (let i = 0; i < iterable.length; i++) {
        /* pass by reference */
        xen_variables[varName] = iterable[i];
        xen_eval(content);
        iterable[i] = xen_variables[varName];
    }
    
    xen_variables[varName] = temp;
}`);