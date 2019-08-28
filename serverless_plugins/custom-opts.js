const cuid = require('cuid');

class CustomOptsPlugin {
    constructor() {
        this.commands = {
            deploy: {
                options: {
                    passwd: {
                        usage:
                            'Specify the password required to access client application',
                        required: true
                    }
                }
            }
        };
    }
}

module.exports = CustomOptsPlugin;
