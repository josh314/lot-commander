var salt = (Math.random().toString(36)+'00000000000000000').slice(2, 18);

module.exports = {
  cookieSecret: salt,
};