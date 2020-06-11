/**
 * All these are constants which cannot be changed
 */

var waves = {
    saw: Symbol("sawtooth"),
    tri: Symbol("triangle"),
    sine: Symbol("sine"),
    square: Symbol("square"),
}

/**
 * Public xen language variables and functions
 */
const xen = {
    "...": Symbol("..."),
    true: true,
    false: false,
    pi: Math.PI,
    e: Math.E,
    fifth: tune.JI.fifth,
    third: tune.JI.third,
    seventh: tune.JI.seventh,
    octave: tune.FreqRatio(2),
    sawtooth: waves.saw,
    saw: waves.saw,
    sine: waves.sine,
    triangle: waves.tri,
    tri: waves.tri,
    square: waves.square,
    rect: waves.square,
};

export default xen;