const { fetchStackInfo } = require('./utils');

class OutputPlugin {
    constructor(serverless) {
        this.serverless = serverless;
        this.provider = this.serverless.getProvider('aws');

        this.hooks = {
            'after:deploy:deploy': this.process.bind(this)
        };
    }

    async process() {
        console.log('🖨 Collect CloudFormation output');

        const { Outputs } = await fetchStackInfo(this.serverless);

        const outputs = Outputs.reduce((outputs, output) => {
            outputs[output.OutputKey] = output.OutputValue;
            return outputs;
        }, {});

        this.provider.outputs = outputs;
    }
}

module.exports = OutputPlugin;
