const fs = require('fs');

let config = JSON.parse(fs.readFileSync('setup.json', 'utf8'));

module.exports = {
  prefix: config.prefix,
  admins: config.admins,
  guild_id: config.guild_id,
  currency_name: config.currency_name
}