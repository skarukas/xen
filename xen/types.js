// Cents class not defined in tune
export class Cents extends tune.ETInterval {
    // TAKES IN THE NUMBER OF STEPS!!
    constructor(c) {
        super(c);
    }
    static fromCount(n) {
        return new Cents(n / 100);
    }
    toString() {
        return this.cents() + "c";
    }
}
Array.prototype.toString = function() {
    return `[${this.join(", ")}]`;
}

// change display
tune.Frequency.prototype.toString = function() {
    return tune.Util.round(this.freq, 2) + "hz";
}
tune.ETInterval.prototype.toString = function() {
    return tune.Util.round(this.n, 2) + "#" + tune.Util.round(this.d, 2);
}