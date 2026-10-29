// thin declaration to avoid having to pull in either all the DOM or all the Node globals just to print debug messages
declare const console: {
  error: (...args: unknown[]) => void,
  log: (...args: unknown[]) => void
}