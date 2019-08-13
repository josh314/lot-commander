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
        "no-unused-vars": [ 
          "warn", 
          { 
              "caughtErrors": "none",
              varsIgnorePattern: "^_$",
          }
        ],
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
        "angular/di": [2, "array"],
        "angular/json-functions": "off",
        "angular/log": "off",
        "angular/no-service-method": "off",
        "angular/on-watch": "off",
    }
};