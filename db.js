const mongo = require("./mongo.js");

let db = mongo.getDb();
let collection;

db.then((db) => {
  console.log("Connected to DB");
  collection = db.collection("storage");
});

async function insert_user(id) {
  await collection.insertOne({"id": id, "bal": 0, "inv": {}});
}

async function replace_user(id, newbal, inv) {
  await collection.replaceOne({"id": id}, {"id": id, "bal": Number(newbal), "inv": inv});
}

async function find(id) {
  return await collection.findOne({"id": id});
}

async function get_all_users() {
  let results = await collection.find({ id: { $regex: /\d{18}/ } });
  return results.toArray();
}

async function store_change(items) {
  await collection.replaceOne({"id":"store"}, {"id": "store", "items": items});
}

async function income_change(income) {
  await collection.replaceOne({"id": "income"}, {"id": "income", "income": income});
}

async function stakes_change(stakes) {
  await collection.replaceOne({"id": "stakes"}, {"id": "stakes", "stakes": stakes});
}

async function market_change(market) {
  await collection.replaceOne({"id": "market"}, {"id": "market", "market": market});
}

async function insert_one(object) {
  await collection.insertOne(object);
}

//args shouldnt be all args 
async function find_similar_items(args) {
  //get rid of numbers, and mentions, combine rest of args
  args = args.filter(arg => isNaN(arg) && !arg.includes('<'));
  let query = args.join('_');
  let store = await find('store');
  let items = store.items;
  for (let i=0; i < Object.keys(items).length; i++) {
    let item_name = Object.keys(items)[i];
    if (query == item_name) {
      return item_name;
    }
    if (query.includes('_')) {
      query = query.split('_').map(arg => arg[0].toUpperCase()+arg.slice(1)).join('_')
      if (query == item_name || query.replace('_', '').toLowerCase() === item_name.toLowerCase()) {
        return item_name;
      }
    } else {
      if (query.toLowerCase() == item_name.toLowerCase()) {
        return item_name;
      }
    }
  }
  return false
}

module.exports = {
  find: find,
  insert_user: insert_user,
  replace_user: replace_user,
  get_all_users: get_all_users,
  store_change: store_change,
  income_change: income_change,
  stakes_change: stakes_change,
  market_change: market_change,
  insert_one: insert_one,
  find_similar_items: find_similar_items
}
