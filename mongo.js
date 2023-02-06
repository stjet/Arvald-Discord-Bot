require('dotenv').config();
const mongo = require('mongodb');

let client = new mongo.MongoClient(process.env.mongo_connection_url, { useNewUrlParser: true, useUnifiedTopology: true })

module.exports = {
  getDb: async function() {
    await client.connect();
    return client.db('db');
  },
};