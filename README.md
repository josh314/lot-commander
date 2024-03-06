# Lot Commander

Internal app for managing inventory and creating manifested lots.

## Node version

Currently using Node 20.x.

## Bootswatch

For styling, this project uses the Bootswatch project which is a riff on Bootstrap. Note the non-standard version in `package.json`: 3.4.1+1. This is required to pull a tagged commit for a hotfix without which the LESS source won't compile. This commit was never merged in properly into the release branch for version 3 as the Bootswatch team moved onto version 4. 

## Development

### `npm` scripts

Use `nodemon` and `webpack-dev-server` for development:

```
npm run demon
```

and

```
npm run dev-server
```

These utilize linting for both the server code and client code. There are separate `.eslintrc` files for the server and client.

