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
        "__basedir": "readable",
        "__connections": "readable",
        "__config": "readable",
        "__logger": "readable",
        "__mongooseConnection": "readable"
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
            2,
            { "SwitchCase": 1 }
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
        "no-throw-literal": "error",
        // "no-undef": "off",
        "no-unused-vars": [
            "warn",
            {
                "caughtErrors": "none",
                varsIgnorePattern: "^_",
                argsIgnorePattern: "^_",
            }
        ],
        "no-useless-catch": "off",
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