const mongo = require("./mongo.js");

let db = mongo.getDb();
let collection;

db.then((db) => {
  collection = db.collection("collection");
});

//collection.insertOne({"id":"store"})

async function insert(id,bal,inv) {
  await collection.insertOne({"id":id,"bal":Number(bal),"inv":inv});
}

async function replace(id, newbal,inv) {
  await collection.replaceOne({"id":id}, {"id":id,"bal":Number(newbal),"inv":inv});
}

async function find(id) {
  return await collection.findOne({"id":id});
}

async function store_change(items) {
  await collection.replaceOne({"id":"store"}, {"id":"store","items":items});
}

async function income_change(income) {
  await collection.replaceOne({"id":"income"}, {"id":"income","income":income});
}

async function stakes_change(stakes) {
  await collection.replaceOne({"id":"stakes"}, {"id":"stakes","stakes":stakes});
}

async function market_change(market) {
  await collection.replaceOne({"id":"market"}, {"id":"market","market":market});
}

async function insertOne(object) {
  await collection.insertOne(object);
}

module.exports = {
  find: find,
  replace: replace,
  insert: insert,
  store_change: store_change,
  income_change: income_change,
  stakes_change: stakes_change,
  market_change: market_change,
  insertOne: insertOne
}