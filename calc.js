import evaluate from "./xen.js";

const version = "1.0.0";
const resultFeed = document.getElementById("result");
const codeInput = document.getElementById("codeInput");
codeInput.placeholder=`xen v. ${version}: type 'help' for documentation`;
codeInput.focus();

const helpText = [
    `xen v. ${version}, © 2020 Stephen Karukas\n`,
    "clear        clear the console",
    "ans          stores the previous answer",
    "a$b          an ET interval ('a' steps in 'b'-ET)",
    "et(a, b)     an ET interval ('a' steps in 'b'-ET)",
    "a:b          a frequency ratio",
    "ratio(a, b)  a frequency ratio",
    "$ a          convert 'a' to 12ET",
    ": a          convert 'a' to an integer frequency ratio",
    "$            convert previous answer to 12ET",
    ":            convert previous answer an integer frequency ratio",
    "mtof(a)      convert a MIDI number to a frequency",
    "ftom(a)      convert a frequency to a MIDI number",
    "x = 10:9     define a variable",
    "",
    "work with intervals just like numbers: + - / * % (mod)",
    "(numbers are automatically converted to 12ET intervals when needed)",
    "",
    "built in intervals:",
    "  - octave: 12$12",
    "  - fifth: 3:2",
    "  - third: 5:4",
    "  - seventh: 7:4",

];
const helpString = helpText.reduce((rest, e) => rest + "\n" + e);

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
    codeInput.placeholder = "";
    let inputExpr = codeInput.value;
    let result;
    appendNewDiv("inputExpression", `> ${inputExpr}`);

    if (inputExpr == 'clear') {
        // clear the feed
        resultFeed.innerHTML = "";
    } else if (inputExpr == 'meme') {
        let i = 5;
        // act like an idiot
        appendNewDiv("error", "XERR_FATAL: A fatal error occured while attempting " +
                              "to access symbol $meme stored at memory address 0x9400-0x97FF. " +
                              `Rebooting local machine in ${i} seconds...`);
        appendNewDiv("error", ``);
        let interval = setInterval(() => {
            if (i == 0) {
                clearInterval(interval);
                appendNewDiv("help", "meme");
                document.body.classList.add("meme");
            } else {
                appendNewDiv("error", `${--i} seconds...`);
            }
        }, 1000);
        
    } else if (inputExpr == 'help') {
        // display documentation
        displayHelp();
        pastInputs.push(inputExpr);
    } else {
        try {
            // not case sensitive
            inputExpr = inputExpr.toLowerCase();
            if (inputExpr == "$" || inputExpr == ":") {
                // convert the previous answer with prefix operator
                result = evaluate(inputExpr + " ans");
            } else if (inputExpr == "c" || inputExpr == "hz") {
                // convert the previous answer with postfix operator
                result = evaluate("ans " + inputExpr);
            } else {
                // evaluate the current expression
                result = evaluate(inputExpr);
                pastInputs.push(inputExpr);
            }
            if (result) appendNewDiv("output", result);
        } catch (e) {
            appendNewDiv("error", e);
            pastInputs.push(inputExpr);
        }
    }

    codeInput.value = "";
    codeInput.scrollIntoView();
}