import xen from "./xen.js";

// ==== WebAudio Master Objects ====
let audioContext;
let filterNode;
let masterGainNode;
let stereoWidth = 0.8;

xen.playback = function(freqs) {
    //audioOn || initAudio();
    for (let i = 0; i < freqs.length; i++) {
        let freq = freqs[i];
        if (freq < 20 || freq > 20000) {
            throw new RangeError(`Cannot play frequencies outside human hearing range.
            Given: ${freq} Hz.`);
        }
        let frac = (i+1) / (freqs.length + 1);
        let pan = frac * 2 * stereoWidth - stereoWidth;
        let envelope = new ADSR(0.2, 0, 1, 1);
        playNote(freq, 2, 0.5, envelope, pan);
    }
}

let external = {
    audioOn:false,
    /**
     * Start up WebAudio.
     * 
     */
    init() {
        audioContext = new (window.AudioContext || window.webkitAudioContext);
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 0.5;
    
        filterNode = audioContext.createBiquadFilter();
        filterNode.type = "lowpass";
        filterNode.frequency.value = 2500;
        
        // set flag so this function is only triggered once
        external.audioOn = true;
    
        // patch audio nodes
        filterNode.connect(masterGainNode).connect(audioContext.destination);
    }
};

/**
 * Play back a note through the WebAudio API.
 * 
 * 
 * @param { Number } f   The frequency of the note.
 * @param { Number } dur The duration (in seconds) of the note.
 * @param { Number } maxGain The peak of the envelope.
 * @param { ADSR } envelope The ADSR envelope.
 * @param { Number } pan Stereo pan amount, -1 to 1 (L to R)
 */
function playNote(f, dur, maxGain, envelope, pan) {
    // create individual gain for enveloping
    let oscGain = audioContext.createGain();
    // create oscillator
    let osc = audioContext.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;

    // create pan and set value
    let oscPan = audioContext.createPanner();
    oscPan.panningModel = 'HRTF';
    oscPan.setPosition(pan, 0, 1 - Math.abs(pan));

    // patch together the audio nodes
    osc.connect(oscPan).connect(oscGain).connect(filterNode);

    let begin = audioContext.currentTime;
    let end = audioContext.currentTime + dur;

    // ==== Gain Envelope ====
    envelope.start(oscGain.gain, 0, maxGain, begin);
    envelope.stop(oscGain.gain,  0,          end);
    osc.start();
    osc.stop(end + envelope.release);
    


}

class ADSR {
    /**
     * Create a multipurpose ADSR envelope with which to modulate an `AudioParam` object.
     * 
     * @param { Number } attack   The duration (in seconds) of the attack portion of the envelope.
     * @param { Number } decay    The duration (in seconds) of the decay portion of the envelope.
     * @param { Number } sustain  The level at which to sustain (between 0. and 1.) after the decay.
     * @param { Number } release  The duration (in seconds) of the release portion of the envelope.
     */
    constructor(attack, decay, sustain, release) {
        this.attack = attack;   // seconds
        this.decay = decay;     // seconds
        this.sustain = sustain; // value 0.0 - 1.0
        this.release = release; // seconds
    }
    /**
     * Schedule the 'note-on' (attack / decay / sustain) portion of the ADSR envelope.
     * 
     * @param { AudioParam } param  The 'AudioParam' object to molulate.
     * @param { Number }     minVal The value from which to begin the envelope.
     * @param { Number }     maxVal The maximum value of the envelope (e.g. value before decay).
     * @param { Number }     begin  The `AudioContext` time (in seconds) at which to begin.
     * 
     * @return                      The ADSR object (`this`), to enable chaining.
     */
    start(param, minVal, maxVal, begin) {
        param.setValueAtTime(minVal, begin); // hacky way to add an instantaneous event
        param.linearRampToValueAtTime(maxVal,                begin + this.attack); // attack
        param.linearRampToValueAtTime(this.sustain * maxVal, begin + this.attack + this.decay); // decay
        return this;
    }
    /**
     * Schedule the 'note-off' (release) portion of the ADSR envelope.
     * 
     * @param { AudioParam } param    The 'AudioParam' object to molulate.
     * @param { Number }     minVal   The value to which the envelope should release.
     * @param { Number }     begin    The `AudioContext` time (in seconds) at which to begin.
     * @param { Function }   callback (optional) A function to execute after the release of the envelope.
     * 
     * @return { Number }             The id of the JS timer that schedules the execution of `callback`. 
     */
    stop(param, minVal, begin, callback = null) {
        param.cancelScheduledValues(begin); // stop envelopes
        param.linearRampToValueAtTime(minVal, begin + this.release); // complete release
        // fire callback after release is completed
        let endTime = (begin - audioContext.currentTime) + this.release;
        let timeout = (callback)? setTimeout(callback, endTime * 1000) : 0;
        return timeout;
    }
}

/**
 * Modulates `AudioParam` `param` from `start` to `end` in `dur` seconds. 
 * When finished, `callback` is executed.
 */
function line(param, start = param.value, end, dur, callback) {
    param.value = start;
    //param.setValueAtTime(start, audioContext.currentTime); // hacky way to add an instantaneous event
    param.linearRampToValueAtTime(end, audioContext.currentTime + dur);
    callback && setTimeout(callback, dur * 1000);
}

export default external;