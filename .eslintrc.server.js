module.exports = {
    "env": {
        "node": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
    ],
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "globals": {
        "__config": false,
        "__logger": false,
        "__basedir": false,
    },
    "rules": {
        "array-callback-return": [
            "error",
            { "allowImplicit": true } 
        ],
        "block-scoped-var": "error",
        // "default-case": "error",
        "indent": [
            "warn",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "no-console": "off",
        "no-caller": "error",
        // "no-empty-function": "warn",
        // "no-eq-null": "error",
        "no-template-curly-in-string": "warn",
        // "no-undef": "off",
        // "no-unused-vars": "off",
        // "quotes": [
        //     "error",
        //     "single"
        // ],
        "semi": [
            "warn",
            "always"
        ],
    }
};