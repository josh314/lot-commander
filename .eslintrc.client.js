module.exports = {
    "env": {
        // "node": true,
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:import/errors",
    ],
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
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
        "no-extra-semi": "warn",
        "no-template-curly-in-string": "warn",
        "no-undef": "error",
        "no-unused-vars": [
          "warn",
          {
              "caughtErrors": "none",
              varsIgnorePattern: "^_",
              argsIgnorePattern: "^_",
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
    }
};