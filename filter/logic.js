'use strict';

class LogicFilter {
    constructor(options) {
        this.options = options;
    }

    async process(frame) {
        const options = this.options;
        if (options.if) {
            let result;
            switch (options.if.condition) {
                case 'field_exists': {
                    if (options.if.field !== undefined && options.if.field !== null) {
                        result = String(options.if.field) in frame;
                    }
                    break;
                }
                default: break;
            }
            if (result === true) this.doThen(frame);
            else if (result === false) this.doElse(frame);
        }

        return true;
    }

    doThen(frame) {
        const options = this.options;
        if (options.then) {
            switch (options.then.action) {
                case 'change_output': {
                    if (options.then.output !== undefined && options.then.output !== null) {
                        frame.$output = options.then.output;
                    }
                    break;
                }
                default: break;
            }
        }
    }

    doElse(frame) {
        const options = this.options;
        if (options.else) {
            switch (options.else.action) {
                case 'change_output': {
                    if (options.else.output !== undefined && options.else.output !== null) {
                        frame.$output = options.else.output;
                    }
                    break;
                }
                default: break;
            }
        }
    }
}

module.exports = LogicFilter;
