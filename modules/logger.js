const path = require('path');
const fs = require('fs');
const winston = require('winston');
const moment = require('moment');

const loggingPath = path.join(__basedir, __config.logging.path);
if(!fs.existsSync(loggingPath)) {
  fs.mkdirSync(loggingPath);
}

let consoleLevel;
const defaultConsoleLevel = 'error';
if(__config.logging.level && __config.logging.level.console) {
  consoleLevel = __config.logging.level.console;
}
else {
  console.log(`No console logging level set. Defaulting to ${defaultConsoleLevel}.`);
  consoleLevel = defaultConsoleLevel;
}

let fileLevel;
const defaultFileLevel = 'error';
if(__config.logging.level && __config.logging.level.file) {
  fileLevel = __config.logging.level.file;
}
else {
  console.log(`No file logging level set. Defaulting to ${defaultFileLevel}.`);
  fileLevel = defaultFileLevel;
}

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: consoleLevel,
      timestamp: function () {
        return (new Date()).toISOString();
      }
    }),
    new winston.transports.File({
      filename: path.join(loggingPath, `manifester-${moment().format('YYYY-MM-DD')}.log`),
      level: fileLevel,
      timestamp: function () {
        return (new Date()).toISOString();
      }
    }),
  ]
});

module.exports = logger;