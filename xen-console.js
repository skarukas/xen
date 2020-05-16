import xen from "./xen.js";
import playback from "./xen-webaudio-playback.js";
const evaluate = xen.evaluate;

const version = "1.0.0";
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
 - clear    clear the console
 - ans      a variable storing the previous answer
`;
//const helpString = helpText.reduce((rest, e) => rest + "\n" + e);

// dark mode
$( ".dark-switch" ).on("click", function() {
    if( $( "body" ).hasClass( "dark-primary" )) {
      $( "body" ).removeClass( "dark-primary" );
      $( "#codeInput" ).removeClass( "dark-primary" );
      $( "footer" ).removeClass( "dark-secondary" );
      $( ".dark-switch" ).text( "dark mode is off" );
    } else {
      $( "body" ).addClass( "dark-primary" );
      $( "#codeInput" ).addClass( "dark-primary" );
      $( "footer" ).addClass( "dark-secondary" );
      $( ".dark-switch" ).text( "dark mode is on" );
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
                if (result) appendNewDiv("output", `${result.value} (${result.type})`);
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

evaluate(`avg(x, y) = @js {
    let sum = add(x, y);
    return divide(sum, 2);
}`);

evaluate(`@js {
    myAvg = function(x, y) {
        let sum = add(x, y);
        return divide(sum, 2);
    }
}`);

evaluate(`@tag scl {
    let arr = content.split(" ");
    arr = arr.filter((ln) => ln && (ln[0] != "!"));
    return arr;
}`);