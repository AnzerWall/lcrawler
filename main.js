'use strict';

// const program = require('commander');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

//
// program
//     .version('0.1.0')
//     .option('-c --config <path>', 'set config file path')
//     .parse(process.argv);


const configFilePath = path.join(__dirname, 'config.yaml');
console.log('[lcrawler] version 1.0.0');
if (!fs.existsSync(configFilePath)) {
    console.log('config not found');
    process.exit();
}
const config = yaml.safeLoad(fs.readFileSync(configFilePath));
const filterList = (config.filter || []).map(options => {
    const type = options.type;
    const module = require(path.join(__dirname, 'filter', type + '.js'));
    return new module(options);
});
const outputs = Object
    .keys(config.output)
    .reduce((pre, type) => {
        const module = require(path.join(__dirname, 'output', type + '.js'));
        pre[type] = new module(config.output[type]);
        return pre;
    }, {});
process.on('uncaughtException', function(err) {
    console.error(new Date(), 'Uncaught Exception:', err.stack);

});

process.on('unhandledRejection', function(reason, promise) {
    console.error(new Date(), 'Unhandled Rejection at:', promise, 'reason:', reason);
});
if (config.input) {
    for (const type of Object.keys(config.input)) {
        const options = config.input[type];
        const module = require(path.join(__dirname, 'input', type + '.js'));
        const input = new module(options);
        input.run();
        input.on('data', async data => {
            for (const filter of filterList) {
                const ok = await filter.process(data);
                if (!ok) return;
            }
            switch (data.$output) {
                case '$all': {
                    for (const type of Object.keys(outputs)) {
                        const output = outputs[type];
                        try {
                            output.process(data);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    if (data.$output && outputs[data.$output]) {
                        const output = outputs[data.$output];
                        try {
                            output.process(data);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    break;
                }
                case '$none': {
                    break;
                }
                default: {
                    if (data.$output && outputs[data.$output]) {
                        const output = outputs[data.$output];

                        try {
                            output.process(data);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    break;
                }
            }
        });

    }
}

