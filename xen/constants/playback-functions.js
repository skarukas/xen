import { assertDefined, givenVals, displayType, isInterval } from "../helpers";
import external from "../main";
import xen from "../constants";

xen.play = function(...args) {
    let C = tune.Frequency(261.63); // default to middle C
    let baseFreq;
    let freqs = [];
    let waveshape;

    try {
        // convert all to freqs and add them
        processArgs(args);
        // call the audio-producing function
        external.playback(freqs, waveshape);
    } catch (e) {
        throw e || new TypeError(`Ambiguous or incorrect call to play().
        ${givenVals(...args)}`);
    }

    function processArgs(arr) {
        let f;
        for (let arg of arr) {
            switch (displayType(arg)) {
                case 'waveshape':
                    waveshape = arg.description;
                    break;
                case 'list':   
                    processArgs(arg); // flatten the list
                    break;
                case 'et':
                    // if small, interpret as an interval
                    if (xen.freq(arg).freq < 20) addRelative(arg);
                    else addFixed(arg); // otherwise, convert to freq
                    break;
                // convert to freq
                case 'number': 
                case 'freq': 
                    addFixed(arg);
                    break;
                // play above the base freq
                case 'cents':  
                case 'ratio':
                    addRelative(arg);
                    break;
                default:
                    throw "";
            }
        }
        // interpret the value as a fixed freq
        function addFixed(arg) {
            f = xen.freq(arg);
            freqs.push(f.freq);
            baseFreq = baseFreq || f;
        }
        // interpret the value as an interval
        function addRelative(arg) {
            // C = default
            if (!baseFreq) {
                // if no base frequency, use C and play it back
                baseFreq = C;
                freqs.push(xen.freq(C).freq);
            }
            f = baseFreq.noteAbove(arg);
            freqs.push(f.freq);
        }
    }
}