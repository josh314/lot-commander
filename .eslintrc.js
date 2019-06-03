module.exports = {
    "env": {
        // "node": true,
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "angular"
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
    "plugins": [
        "angular"
    ],
    "rules": {
        "array-callback-return": [
            "error",
            { "allowImplicit": true } 
        ],
        "block-scoped-var": "error",
        // "default-case": "error",
        "indent": [
            "error",
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
        // Angular plugin rules
        "angular/controller-as": "off",
        "angular/controller-name": "off",
        "angular/definedundefined": "off",
        "angular/di": [2, "array"],
        "angular/json-functions": "off",
        "angular/log": "off",
        // "angular/module-getter": "off",
        // "angular/module-setter": "off",
        "angular/no-service-method": "off",
        "angular/on-watch": "off",
    }
};