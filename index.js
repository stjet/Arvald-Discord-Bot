const Discord = require('discord.js');
//const client = new Discord.Client({fetchAllMembers: true});
const botIntents = new Discord.Intents();
botIntents.add(['GUILD_MESSAGES', 'GUILD_MEMBERS', 'GUILDS', 'GUILD_MESSAGE_REACTIONS'])
const client = new Discord.Client({intents:botIntents});

const keep_alive = require('./keep_alive.js');

const db = require('./db.js');

const config = require('./config.js');

const {token} = process.env;

const prefix = config.prefix;
const currency_name = config.currency_name;

const eval_enabled = false;

const admins = config.admins;

const guild_id = config.guild_id;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(prefix+'help', { type: 'PLAYING' });
  //setInterval
  setInterval(async function(){
    console.log("Role income started")
    let income = await db.find("income");
    if (!income) {
      await db.insertOne({"id":"income","income":"{}"});
      income = await db.find("income");
    }
    await client.guilds.fetch();
    let guild = client.guilds.cache.get(guild_id);
    await guild.members.fetch();
    await guild.roles.fetch();
    income = JSON.parse(income.income);
    for (i=0; i < Object.keys(income).length; i++) {
      let roleincome = income[Object.keys(income)[i]]
      let role = guild.roles.cache.get(Object.keys(income)[i]);
      if (!role) {
        continue
      }
      let members = role.members.map(m=>m.user.id);
      if (Date.now() > roleincome.last_claim+(roleincome.claim_every*3600000)) {
        let multiplier = Math.floor((Date.now()-roleincome.last_claim)/(roleincome.claim_every*3600000));
        for (j=0; j < members.length; j++) {
          //'claim_every': claim_every, 'amount': amount, 'last_claim': Date.now()
          let stakes = await db.find("stakes");
          if (!stakes) {
            await db.insertOne({"id":"stakes","stakes":"{}"});
            stakes = await db.find("stakes");
          }
          stakes = JSON.parse(stakes.stakes);
          //stakes: '{stake_owner:{stake_issuer: percentage}}'
          let stake_holders = [];
          //gets all holders of user's stakes
          for (k=0; k < Object.keys(stakes).length; k++) {
            let stake_owner = stakes[Object.keys(stakes)[k]];
            for (l=0; l < Object.keys(stake_owner).length; l++) {
              let stake_issuer = Object.keys(stake_owner)[l];
              let percentage = stake_owner[stake_issuer]
              if (stake_issuer == members[j]) {
                stake_holders.push([Object.keys(stakes)[k], percentage]);
              }
            }
          }
          for (m=0; m < stake_holders.length; m++) {
            let user = await db.find("user-"+stake_holders[m][0]);
            if (!user) {
              await db.insert("user-"+stake_holders[m][0], 0, "{}");
              user = await db.find("user-"+stake_holders[m][0]);
            }
            let bal = JSON.parse(user.bal);
            bal += Math.round(roleincome.amount*(stake_holders[m][1]/100))*multiplier;
            await db.replace("user-"+stake_holders[m][0], JSON.stringify(bal), user.inv);
          }
        }
        income[Object.keys(income)[i]].last_claim = Date.now();
        await db.income_change(JSON.stringify(income));
      }
    }
  }, 3600000/2); //3600000/2 is half hour
});

//stakes: '{stake_owner:{stake_issuer: percentage}}'

async function new_check(message) {
  let user = await db.find("user-"+message.author.id);
  if (!user) {
    await db.insert("user-"+message.author.id, 0, "{}");
    let stakes = await db.find("stakes");
    if (!stakes) {
      await db.insertOne({"id":"stakes","stakes":"{}"});
      stakes = await db.find("stakes");
    }
    stakes = JSON.parse(stakes.stakes);
    stakes[message.author.id] = {};
    stakes[message.author.id][message.author.id] = 100;
    stakes = JSON.stringify(stakes);
    await db.stakes_change(stakes);
    message.channel.send("Account intialized");
  }
}

client.on('messageCreate', async message => { 
  const args = message.content.slice(prefix.length).split(' ');  
  const command = args.shift().toLowerCase();

  if (message.guild.id != guild_id) {
    return
  }

  if (message.content.toLowerCase().startsWith(prefix)) {
    await new_check(message);
  }

  if (message.content.toLowerCase() == prefix+"help" || message.content.toLowerCase() == prefix+"commands") {
    let HelpEmbed = new Discord.MessageEmbed()
      .setColor('#17d328')
      .setTitle('Help')
      .addField(prefix+"help", 'Shows this (help) message') //FINISHED
      .addField(prefix+"store [optional: page]", 'Shows store') //FINISHED
      .addField(prefix+"buy [item] [optional: quantity]", 'Buy item from store') //FINISHED
      .addField(prefix+"inv [optional: user @] [optional: page_num]", 'Shows inventory') //FINISHED
      .addField(prefix+"bal [optional: user @]", 'Shows balance') //FINISHED
      .addField(prefix+"transfer [user @] [amount]", 'Transfer funds to different user') //FINISHED
      .addField(prefix+"roll [optional: dice number]d[dice faces]", 'Roll dice') //FINISHED
      .addField(prefix+"leaderboard", 'Shows top 10 highest balance users') //FINISHED
      .addField(prefix+"useitem [item] [optional: quantity]", 'Use items (destroys them)') //FINISHED
      .addField(prefix+"credits", 'Shows credits of bot creator') //FINISHED
      .addField(prefix+"income [optional: ascending/descending]",'Show role income') //FINISHED
      .addField(prefix+"stakeslist", 'Show stakes info') //IN PROGRESS
      .addField(prefix+"stakesbuy [seller: user @]", 'Buy stake') //PENDING TESTING
      .addField(prefix+"stakessell [price] [percentage to sell] [optional: stake issuer user @]", 'Sell stake') //PENDING TESTING
      .addField(prefix+"stakesmarket", 'See which stakes are being sold') //PENDING TESTING
      .addField(prefix+"stakescancel", 'Cancels sell order') //PENDING TESTING
      .addField(prefix+"nextincome [role @]", 'When next role income payout') 
      .setTimestamp()
    if (admins.includes(message.author.id)) {
      let AdminHelpEmbed = new Discord.MessageEmbed()
        .setColor('#17d328')
        .addField(prefix+"editincome [role @] [claim every x hours] [amount]",'Edit role income') //FINISHED
        .addField(prefix+"deleteincome [role @]",'Delete role income') //FINISHED
        .addField(prefix+"createincome [role @] [claim every x hours] [amount]",'Create role income') //FINISHED
        .addField(prefix+"edititem [item name] [price] '[description]'",'Edit store item') //FINISHED
        .addField(prefix+"deleteitem [item name]",'Delete store item') //FINISHED
        .addField(prefix+"createitem [name] [price] '[description]'",'Create store item. Multi word item names are not allowed, please use underscores as a workaround.') //FINISHED
        .addField(prefix+"setbal [user @] [value]",'Set balance of user') //FINISHED
        .addField(prefix+"removeinv [user @] [item] [optional: quantity]",'Remove item from inventory') //FINISHED
        .addField(prefix+"addinv [user @] [item] [optional: quantity]",'Add item to inventory') //FINISHED
        .addField(prefix+"removemoney [user @] [amount]",'Remove money from inventory') //FINISHED
        .addField(prefix+"addmoney [user @] [amount]",'Add money to inventory') //FINISHED
        .setTimestamp()
      return message.channel.send({embeds:[HelpEmbed, AdminHelpEmbed]});
    }
    message.channel.send({embeds:[HelpEmbed]});
  } else if (message.content.toLowerCase().startsWith(prefix+"roll")) {
    let arg = args[0];
    if (!arg) {
      return message.channel.send("Missing first arg");
    }
    if (!arg.includes("d")) {
      return message.channel.send("No 'd', invalid syntax")
    }
    //this means x is not an argument
    if (arg.startsWith("d")) {
      let dice_faces = arg.slice(1);
      try {
        dice_faces = Number(dice_faces);
        if (!dice_faces) {
          return message.channel.send("Second parameter is not a number, syntax error")
        }
      } catch {
        return message.channel.send("First argument is not a number, invalid syntax")
      }
      let roll = Math.round(Math.random() * (dice_faces - 1) + 1);
      message.channel.send("Result: "+String(roll)+" ("+roll+"="+roll+")");
    } else {
      let args1 = arg.split("d");
      let dice_num;
      try {
        dice_num = Number(args1[0]);
        if (!dice_num) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
      } catch {
        return message.channel.send("First argument is not a number, invalid syntax")
      }
      let dice_faces;
      try {
        dice_faces = Number(args1[1]);
        if (!dice_faces) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
      } catch {
        return message.channel.send("Second argument is not a number, invalid syntax");
      }
      let dice_result = [];
      for (let i = 0; i < dice_num; i++) {
        let roll = Math.round(Math.random() * (dice_faces - 1) + 1);
        dice_result.push(roll);
      }
      let total = 0;
      let calculation = "";
      for (let i = 0; i < dice_result.length; i++) {
        total += dice_result[i];
        calculation += String(dice_result[i])
        if (i != dice_result.length-1) {
          calculation += "+";
        }
      }
      message.channel.send("Result: "+String(total)+" ("+calculation+"="+total+")");
    }
  } else if (message.content.toLowerCase().startsWith(prefix+"bal")) {
    let user_name = message.author.username;
    let mention = message.mentions.users.first();
    let user_id = message.author.id;
    if (mention) {
      user_name = mention.username;
      user_id = mention.id;
    }
    let user = await db.find("user-"+user_id);
    if (!user) {
      await db.insert("user-"+user_id, 0, "{}");
      user = await db.find("user-"+user_id);
      let stakes = await db.find("stakes");
      stakes = JSON.parse(stakes.stakes);
      stakes[user_id] = {};
      stakes[user_id][user_id] = 100;
      stakes = JSON.stringify(stakes);
      await db.stakes_change(stakes);
    };
    let title = user_name+"'s Balance";
    let BalEmbed = new Discord.MessageEmbed()
      .setColor('#0d00b4')
      .setTitle(title)
      .setDescription(user.bal+" "+currency_name)
      .setTimestamp()
    message.channel.send({embeds:[BalEmbed]});
  } else if (message.content.toLowerCase().startsWith(prefix+"inv") || message.content.toLowerCase().startsWith(prefix+"items")) {
    let user_name = message.author.username;
    let mention = message.mentions.users.first();
    let user_id = message.author.id;
    let start_page = 1;
    if (mention) {
      user_name = mention.username;
      user_id = mention.id;
      if (args[1]) {
        try {
          start_page = Number(args[1])
          if (!start_page) {
            return message.channel.send("Second parameter is not a number, syntax error");
          }
        } catch {
          return message.channel.send("Second argument is not a number, invalid Syntax");
        }
      }
    } else if (args[0]) {
      try {
        start_page = Number(args[0]);
        if (!start_page) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
      } catch {
        return message.channel.send("First argument is not a number, invalid Syntax");
      }
    }
    let user = await db.find("user-"+user_id);
    if (!user) {
      await db.insert("user-"+user_id, 0, "{}");
      user = await db.find("user-"+user_id);
      let stakes = await db.find("stakes");
      stakes = JSON.parse(stakes.stakes);
      stakes[user_id] = {}
      stakes[user_id][user_id] = 100;
      stakes = JSON.stringify(stakes);
      await db.stakes_change(stakes);
    }
    user.inv = JSON.parse(user.inv)
    let title = user_name+"'s Inventory";
    if (Object.keys(user.inv).length > 8) {
      let embed_pages = [];
      let number_of_pages = Math.ceil(Object.keys(user.inv).length/8);
      for (let i=0; i < number_of_pages; i++) {
        let InvEmbed = new Discord.MessageEmbed()
          .setColor('#bc2134')
          .setTitle(title+" Page "+String(i+1))
          .setTimestamp()
        for (let j=0; j < 8; j++) {
          if ((i*8)+j < Object.keys(user.inv).length) {
            InvEmbed.addField(Object.keys(user.inv)[(i*8)+j], String(user.inv[Object.keys(user.inv)[(i*8)+j]]));
          } else {
            break;
          }
        }
        embed_pages.push(InvEmbed);
      }
      let page_num = start_page;
      message.channel.send({embeds: [embed_pages[page_num-1]]}).then(botmsg => {
        botmsg.react("⬅️");
        botmsg.react("➡️");
        const filter = (reaction, user) => {
          return ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id
        }
        const collector = botmsg.createReactionCollector({filter, time: 60000});
        collector.on('collect', reaction => {
          botmsg.reactions.removeAll().then(async () => {
            if (reaction.emoji.name === '⬅️') {
              page_num--;
            } else if (reaction.emoji.name === '➡️') {
              page_num++;
            }
            if (page_num < 1) {
              page_num = 1;
            } else if (page_num > embed_pages.length) {
              page_num = embed_pages.length;
            }
            botmsg.edit({embeds:[embed_pages[page_num-1]]});
            botmsg.react("⬅️").then(() => botmsg.react("➡️"));
          });
        });
      })
    } else if (Object.keys(user.inv).length == 0) {
      let InvEmbed = new Discord.MessageEmbed()
        .setColor('#bc2134')
        .setTitle(title)
        .setDescription("No items")
        .setTimestamp();
      message.channel.send({embeds:[InvEmbed]})
    } else {
      let InvEmbed = new Discord.MessageEmbed()
        .setColor('#bc2134')
        .setTitle(title)
        .setTimestamp();
      for (let i=0; i < Object.keys(user.inv).length; i++) {
        InvEmbed.addField(Object.keys(user.inv)[i], String(user.inv[Object.keys(user.inv)[i]]));
      }
      message.channel.send({embeds:[InvEmbed]})
    }
  } else if (message.content.toLowerCase().startsWith(prefix+"store") || message.content.toLowerCase().startsWith(prefix+"shop")) {
    let start_page = 1;
    let store = await db.find("store");
    if (!store) {
      await db.insertOne({"id":"store","items":"{}"});
      store = await db.find("store");
    }
    let items = JSON.parse(store.items);
    if (args[0]) {
      try {
        start_page = Number(args[0]);
        if (!start_page) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
        if (start_page < 1) {
          return message.channel.send("Invalid page number");
        }
      } catch {
        return message.channel.send("First (optional) argument is not a number")
      }
    }
    if (Object.keys(items).length > 8) {
      let embed_pages = [];
      let number_of_pages = Math.ceil(Object.keys(items).length/8);
      if (number_of_pages < start_page) {
        message.channel.send("That page number does not exist");
        start_page = number_of_pages;
      }
      for (let i=0; i < number_of_pages; i++) {
        let StoreEmbed = new Discord.MessageEmbed()
          .setColor('#5a6347')
          .setTitle("Store Page "+String(i+1))
          .setTimestamp()
        for (let j=0; j < 8; j++) {
          if ((i*8)+j < Object.keys(items).length) {
            StoreEmbed.addField(Object.keys(items)[(i*8)+j]+": "+String(items[Object.keys(items)[(i*8)+j]].price)+" "+currency_name,items[Object.keys(items)[(i*8)+j]].description);
          } else {
            break
          }
        }
        embed_pages.push(StoreEmbed);
      }
      let page_num = start_page;
      message.channel.send({embeds:[embed_pages[page_num-1]]}).then(botmsg => {
        botmsg.react("⬅️");
        botmsg.react("➡️");
        const filter = (reaction, user) => {
          return ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id
        }
        const collector = botmsg.createReactionCollector({filter, time: 60000});
        collector.on('collect', reaction => {
          botmsg.reactions.removeAll().then(async () => {
            if (reaction.emoji.name === '⬅️') {
              page_num--;
            } else if (reaction.emoji.name === '➡️') {
              page_num++;
            }
            if (page_num < 1) {
              page_num = 1;
            } else if (page_num > embed_pages.length) {
              page_num = embed_pages.length;
            }
            botmsg.edit({embeds:[embed_pages[page_num-1]]});
            botmsg.react("⬅️").then(() => botmsg.react("➡️"));
          });
        });
      })
    } else if (Object.keys(items).length == 0) {
      let StoreEmbed = new Discord.MessageEmbed()
        .setColor('#5a6347')
        .setTitle("Store")
        .setDescription("No items")
        .setTimestamp();
      message.channel.send({embeds:[StoreEmbed]})
    } else {
      let StoreEmbed = new Discord.MessageEmbed()
        .setColor('#5a6347')
        .setTitle("Store")
        .setTimestamp();
      for (let i=0; i < Object.keys(items).length; i++) {
        StoreEmbed.addField(Object.keys(items)[i]+": "+String(items[Object.keys(items)[i]].price)+" "+currency_name,items[Object.keys(items)[i]].description);
      }
      message.channel.send({embeds:[StoreEmbed]})
    }
  } else if (message.content.toLowerCase().startsWith(prefix+"transfer") || message.content.toLowerCase().startsWith(prefix+"pay")) {
    //[user @] [amount]
    let mention = message.mentions.users.first();
    if (!mention) {
      return message.channel.send("Mention missing, syntax error");
    }
    let amount = args[1];
    if (!amount) {
      return message.channel.send("Missing second parameter, syntax error");
    } else {
      try {
        amount = Number(amount);
        if (!amount) {
          return message.channel.send("Second parameter is not a number, syntax error")
        }
      } catch {
        return message.channel.send("Second parameter is not a number, error");
      }
    }
    if (amount < 0) {
      return message.channel.send("Amount cannot be negative, error")
    }
    let sender = await db.find("user-"+message.author.id);
    let receiver = await db.find("user-"+mention.id);
    if (message.author.id == mention.id) {
      return message.channel.send("Cannot transfer money to yourself, error")
    }
    if (!receiver) {
      await db.insert("user-"+mention.id, 0, "{}");
      receiver = await db.find("user-"+mention.id);
      let stakes = await db.find("stakes");
      stakes = JSON.parse(stakes.stakes);
      stakes[mention.id] = {}
      stakes[mention.id][mention.id] = 100;
      stakes = JSON.stringify(stakes);
      await db.stakes_change(stakes);
    }
    if (sender.bal < amount) {
      return message.channel.send("Sender balance too low")
    }
    sender_bal = sender.bal-amount;
    receiver_bal = Number(receiver.bal)+amount;
    await db.replace("user-"+message.author.id, sender_bal, sender.inv);
    await db.replace("user-"+mention.id, receiver_bal, receiver.inv);
    message.channel.send("Successfully sent "+amount+" to "+mention.username);
  } else if (message.content.toLowerCase().startsWith(prefix+"buy")) {
    //[item] [optional: quantity]
    let item_name = args[0];
    let quantity = 1;
    if (args[1]) {
      try {
        quantity = Number(args[1]);
        if (!quantity) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
      } catch {
        return message.channel.send("Second argument is not number, error")
      }
    }
    let store = await db.find("store");
    if (!store) {
      await db.insertOne({"id":"store","items":"{}"});
      store = await db.find("store");
    }
    let items = JSON.parse(store.items);
    if (!items[item_name]) {
      return message.channel.send("This item does not exist, error");
    }
    let user = await db.find("user-"+message.author.id);
    let price = items[item_name].price;
    if (user.bal < price*quantity) {
      return message.channel.send("You cannot afford this, error");
    }
    let user_bal = user.bal-(price*quantity);
    let user_inv = JSON.parse(user.inv);
    if (user_inv[item_name]) {
      user_inv[item_name] = user_inv[item_name]+quantity;
    } else {
      user_inv[item_name] = quantity;
    }
    user_inv = JSON.stringify(user_inv);
    await db.replace("user-"+message.author.id, user_bal, user_inv);
    message.channel.send("Bought items");
  } else if (message.content.toLowerCase().startsWith(prefix+"useitem")) {
    //[item] [optional: quantity]
    let item_name = args[0];
    let quantity = 1;
    if (args[1]) {
      try {
        quantity = Number(args[1]);
        if (!quantity) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
      } catch {
        return message.channel.send("Second argument is not number, error")
      }
    }
    let store = await db.find("store");
    if (!store) {
      await db.insertOne({"id":"store","items":"{}"});
      store = await db.find("store");
    }
    let items = JSON.parse(store.items);
    if (!items[item_name]) {
      return message.channel.send("This item does not exist, error");
    }
    let user = await db.find("user-"+message.author.id);
    
    let replace_inv = JSON.parse(user.inv);
    if (!replace_inv[item_name]) {
      return message.channel.send("Error, not possible because the user does not have the item")
    } else {
      if (replace_inv[item_name] < quantity) {
        return message.channel.send("Error, using more items than exist in the user's inventory is not allowed")
      }
      replace_inv[item_name] = replace_inv[item_name]-quantity;
      if (replace_inv[item_name] == 0) {
        delete replace_inv[item_name]
      }
    }
    replace_inv = JSON.stringify(replace_inv)
    await db.replace("user-"+message.author.id, user.bal, replace_inv);
    message.channel.send("Success in using items")
  } else if (message.content.toLowerCase().startsWith(prefix+"credits")) {
    const creditEmbed = new Discord.MessageEmbed()
      .setColor('#11c384')
      .setTitle('Credits')
      .setURL('https://prussia.dev')
      .setDescription("The Arvald bot was made for Nnomtnert's Arvald by Prussia")
    return message.channel.send({embeds:[creditEmbed]});
  } else if (message.content.toLowerCase().startsWith(prefix+"income")) {
    //format: {role id: {amount: money, claim_every: hours, last_claim: miliseconds}}
    let income = await db.find("income");
    if (!income) {
      await db.insertOne({"id":"income","income":"{}"});
      income = await db.find("income");
    }
    income = JSON.parse(income.income);
    let income_keys = Object.keys(income);
    if (args[0] == "descending" || args[0] == "d") {
      //this will find highest amount in income, add to new list, remove from old, repeat until no more left
      let old_income = Object.keys(income);
      let new_income = [];
      let length = Object.keys(income).length;
      for (e=0; e < length; e++) {
        let biggest;
        for (i=0; i < old_income.length; i++) {
          if (!biggest) {
            biggest = i;
          } else if (income[old_income[i]].amount > income[old_income[biggest]].amount) {
            biggest = i;
          }
        }
        new_income.push(old_income[biggest]);
        old_income.splice(biggest, 1);
      }
      income_keys = new_income;
    } else if (args[0] == "ascending" || args[0] == "a") {
      let old_income = Object.keys(income);
      let new_income = [];
      let length = Object.keys(income).length;
      for (e=0; e < length; e++) {
        let smallest;
        for (i=0; i < old_income.length; i++) {
          if (!smallest) {
            smallest = i;
          } else if (income[old_income[i]].amount < income[old_income[smallest]].amount) {
            smallest = i;
          }
        }
        new_income.push(old_income[smallest]);
        old_income.splice(smallest, 1);
      }
      income_keys = new_income;
    }
    if (income_keys.length == 0) {
      let IncomeEmbed = new Discord.MessageEmbed()
        .setColor('#84597f')
        .setTitle("Role Income")
        .setTimestamp();
      IncomeEmbed.setDescription("No role income");
      message.channel.send({embeds:[IncomeEmbed]});
    } else if (income_keys.length <= 25) {
      let IncomeEmbed = new Discord.MessageEmbed()
        .setColor('#84597f')
        .setTitle("Role Income")
        .setTimestamp();
      for (i=0; i < income_keys.length; i++) {
        let role = message.guild.roles.cache.get(income_keys[i]);
        if (!role) {
          continue
        }
        IncomeEmbed.addField(String(income[income_keys[i]].amount)+" "+currency_name+" every "+income[income_keys[i]].claim_every+" hours", role.name);
      }
      message.channel.send({embeds:[IncomeEmbed]});
    } else {
      let embeds = [];
      let number_of_pages = Math.ceil(Object.keys(items).length/25);
      for (i=0; i < number_of_pages; i++) {
        let IncomeEmbed = new Discord.MessageEmbed()
          .setColor('#84597f')
          .setTitle("Role Income")
          .setTimestamp();
        for (let j=0; j < 25; j++) {
          if ((i*25)+j < Object.keys(items).length) {
            IncomeEmbed.addField(String(income[Object.keys(income)[(i*25)+j]].amount)+" "+currency_name+" every "+income[Object.keys(income)[(i*8)+j]].claim_every+" hours", role.name);
          } else {
            break
          }
        }
        embeds.push(IncomeEmbed);
        message.channel.send({embeds:embeds});
      }
    } 
  } else if (message.content.toLowerCase().startsWith(prefix+"stakeslist")) {
    //stakes: '{stake_owner:{stake_issuer: percentage}}'
    let send_string = "";
    let stakes = await db.find("stakes");
    if (!stakes) {
      await db.insertOne({"id":"stakes","stakes":"{}"});
      stakes = await db.find("stakes");
    }
    await message.guild.members.fetch()
    stakes = JSON.parse(stakes.stakes);
    for (i=0; i < Object.keys(stakes).length; i++) {
      let stake_owner = stakes[Object.keys(stakes)[i]];
      let user = message.guild.members.cache.get(Object.keys(stakes)[i]);
      if (!user) {
        continue
      }
      send_string += "**"+user.user.tag+"**\n";
      for (j=0; j < Object.keys(stake_owner).length; j++) {
        let stake_issuer = Object.keys(stake_owner)[j];
        send_string += message.guild.members.cache.get(Object.keys(stake_owner)[j]).user.tag+": "+stake_owner[stake_issuer]+"%\n";
      }
    }
    message.channel.send(send_string);
  } else if (message.content.toLowerCase().startsWith(prefix+"stakesmarket")) {
    //market : '{stake_seller: [percentage,price]}'
    let send_string = "";
    let market = await db.find("market");
    if (!market) {
      await db.insertOne({"id":"market","market":"{}"});
      market = await db.find("market");
    }
    market = JSON.parse(market.market);
    if (!Object.keys(market).length) {
      return message.channel.send("No sales going on at the moment")
    }
    for (i=0; i < Object.keys(market).length; i++) {
      let stake_seller = Object.keys(market)[i];
      await message.guild.members.fetch()
      let user = message.guild.members.cache.get(Object.keys(stakes)[i]);
      if (!user) {
        continue
      }
      send_string += String(market[stake_seller][0])+" percent of "+message.guild.members.cache.get(market[stake_seller][2]).user.tag+" being sold by "+user.user.tag+" for "+String(market[stake_seller][1])+" "+currency_name+"\n";
    }
    message.channel.send(send_string);
  } else if (message.content.toLowerCase().startsWith(prefix+"stakesbuy")) {
    let seller = message.mentions.users.first();
    if (!seller) {
      return message.channel.send("No one mentioned, missing argument error");
    }
    seller = seller.id;
    let market = await db.find("market");
    if (!market) {
      await db.insertOne({"id":"market","market":"{}"});
      market = await db.find("market");
    }
    market = JSON.parse(market.market);
    let offer = market[seller];
    if (!offer) {
      return message.channel.send("That user is not currently selling any stakes")
    }
    let user = await db.find("user-"+message.author.id);
    if (user.bal < offer[1]) {
      return message.channel.send("You cannot afford this");
    }
    delete market[seller];
    await db.market_change(JSON.stringify(market));
    let bal = user.bal-offer[1];
    await db.replace("user-"+message.author.id, bal, user.inv);
    let seller_user = await db.find("user-"+seller);
    let seller_bal = Number(user.bal)+offer[1];
    await db.replace("user-"+seller, seller_bal, seller_user.inv);
    let stakes = await db.find("stakes");
    stakes = JSON.parse(stakes.stakes);
    if (!stakes[message.author.id][offer[2]]) {
      stakes[message.author.id][offer[2]] = offer[0];
    } else {
      stakes[message.author.id][offer[2]] += offer[0];
    }
    stakes[seller][offer[2]] -= offer[0];
    await db.stakes_change(JSON.stringify(stakes));
    message.channel.send("Bought stake successfully");
  } else if (message.content.toLowerCase().startsWith(prefix+"stakessell")) {
    //[price] [percentage to sell]
    let price = args[0];
    let sell_percentage = args[1];
    let stake_issuer = message.mentions.users.first();
    if (!stake_issuer) {
      stake_issuer = message.author.id;
    } else {
      stake_issuer = staker_issuer.id;
    }
    let market = await db.find("market");
    if (!market) {
      await db.insertOne({"id":"market","market":"{}"});
      market = await db.find("market");
    }
    market = JSON.parse(market.market);
    if (price) {
      try {
        price = Number(price);
        if (!price) {
          return message.channel.send("Second parameter is not a number, syntax error")
        }
      } catch {
        return message.channel.send("Price param is not a number");
      }
    } else {
      return message.channel.send("Missing first parameter");
    }
    if (price < 0) {
      return message.channel.send("Sorry, no negative please");
    }
    if (sell_percentage) {
      try {
        sell_percentage = Number(sell_percentage);
        if (!sell_percentage) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
      } catch {
        return message.channel.send("Sell percentage param is not a number");
      }
    } else {
      return message.channel.send("Missing second parameter");
    }
    if (sell_percentage < 0) {
      return message.channel.send("Sorry, no negative please");
    }
    let stakes = await db.find("stakes");
    if (!stakes) {
      await db.insertOne({"id":"stakes","stakes":"{}"});
      stakes = await db.find("stakes");
    }
    stakes = JSON.parse(stakes.stakes);
    if (stakes[message.author.id][stake_issuer] < sell_percentage) {
      return messsage.channel.send("Don't own enough stake")
    }
    if (market[message.author.id]) {
      return message.channel.send("Error, you can only sell one stake at a time")
    }
    market[message.author.id] = [sell_percentage, price, stake_issuer];
    await db.market_change(JSON.stringify(market));
    message.channel.send("Success, selling stake");
  } else if (message.content.toLowerCase().startsWith(prefix+"stakescancel")) {
    let market = await db.find("market");
    if (!market) {
      await db.insertOne({"id":"market","market":"{}"});
      market = await db.find("market");
    }
    market = JSON.parse(market.market);
    delete market[message.author.id];
    await db.market_change(JSON.stringify(market));
    message.channel.send("Canceled stake");
  } else if (message.content.toLowerCase().startsWith(prefix+"nextincome")) {
    let role = message.mentions.roles.first();
    if (!role) {
      return message.channel.send("No role mention");
    }
    let income = await db.find("income");
    if (!income) {
      await db.insertOne({"id":"income","income":"{}"});
      income = await db.find("income");
    }
    income = JSON.parse(income.income);
    if (!income[role.id]) {
      return message.channel.send("Error role income does not exist");
    }
    let minutes = Math.round((Number(income[role.id].last_claim)+Number(income[role.id].claim_every)*60*60*1000 - Date.now())/1000/60);
    let hours = minutes/60;
    if (hours < 1) {
      return message.channel.send(minutes+" minutes. Please note the bot updates role income every half hour or so, so if the time given is less than a half hour (or negative), it may not actually update then.");
    } else {
      return message.channel.send(hours+" hours.");
    }
  } else if (message.content.toLowerCase().startsWith(prefix+"leaderboard") || message.content.toLowerCase().startsWith(prefix+"rich")) {
    let users = await db.get_all_users();
    let new_users = [];
    //sort users by balance, then put in embed
    //we want to get top 10
    for (i=0; i < 10; i++) {
      let greatest;
      for (j=0; j < users.length; j++) {
        if (!greatest) {
          greatest = j;
        } else if (users[j].bal > users[greatest].bal) {
          greatest = j;
        }
      }
      new_users.push(users[greatest]);
      users.splice(greatest, 1);
    }
    //
    let LeaderboardEmbed = new Discord.MessageEmbed()
      .setColor('#99ff99')
      .setTitle('Leaderboard')
      .setFooter('Look mom, it\'s a rich person!')
    for (k=0; k < new_users.length; k++) {
      LeaderboardEmbed.addField(String(new_users[k].bal), "<@"+new_users[k].id.split('-')[1]+">")
    }
    return message.channel.send({embeds:[LeaderboardEmbed]})
  }

  //admin only functions
  if (admins.includes(message.author.id)) {
    if (message.content.toLowerCase().startsWith(prefix+"addinv")) {
      //[user @] [item] [optional: quantity]
      let mention = message.mentions.users.first();
      if (!mention) {
        return message.channel.send("No one mentioned, invalid syntax")
      }
      let item_name = args[1];
      let quantity = 1;
      if (args[2]) {
        try {
          quantity = Number(args[2]);
          if (!quantity) {
          return message.channel.send("Second parameter is not a number, syntax error");
        }
        } catch {
          return message.channel.send("Second argument is not a number, invalid syntax")
        }
      }
      let items = await db.find("store");
      if (!items) {
        await db.insertOne({"id":"store","items":"{}"});
        items = await db.find("store");
      }
      items = JSON.parse(items.items);
      
      if (!items[item_name]) {
        return message.channel.send("Item does not exist")
      }
      let user = await db.find("user-"+mention.id);
      if (!user) {
        await db.insert("user-"+mention.id, 0, "{}");
        user = await db.find("user-"+mention.id);
        let stakes = await db.find("stakes");
        stakes = JSON.parse(stakes.stakes);
        stakes[mention.id] = {}
        stakes[mention.id][mention.id] = 100;
        stakes = JSON.stringify(stakes);
        await db.stakes_change(stakes);
      }
      let replace_inv = JSON.parse(user.inv);
      if (!replace_inv[item_name]) {
        replace_inv[item_name] = quantity;
      } else {
        replace_inv[item_name] = replace_inv[item_name]+quantity;
      }
      replace_inv = JSON.stringify(replace_inv)
      await db.replace("user-"+mention.id, user.bal, replace_inv);
      message.channel.send("Successfully added item "+item_name)
    } else if (message.content.toLowerCase().startsWith(prefix+"removeinv")) {
      let mention = message.mentions.users.first();
      if (!mention) {
        return message.channel.send("No one mentioned, invalid syntax")
      }
      let item = args[1];
      let quantity = 1;
      if (args[2]) {
        try {
          quantity = Number(args[2]);
          if (!quantity) {
            return message.channel.send("Second parameter is not a number, syntax error");
          }
        } catch {
          return message.channel.send("Second argument is not a number, invalid syntax")
        }
      }
      let items = await db.find("store");
      if (!items) {
        await db.insertOne({"id":"store","items":"{}"});
        items = await db.find("store");
      }
      items = JSON.parse(items.items);
      if (!items[item]) {
        return message.channel.send("Item does not exist")
      }
      let user = await db.find("user-"+mention.id);
      if (!user) {
        await db.insert("user-"+mention.id, 0, "{}");
        user = await db.find("user-"+mention.id);
        let stakes = await db.find("stakes");
        stakes = JSON.parse(stakes.stakes);
        stakes[mention.id] = {}
        stakes[mention.id][mention.id] = 100;
        stakes = JSON.stringify(stakes);
        await db.stakes_change(stakes);
      }
      let replace_inv = JSON.parse(user.inv);
      if (!replace_inv[item]) {
        return message.channel.send("Error, not possible because the user does not have the item")
      } else {
        if (replace_inv[item] < quantity) {
          return message.channel.send("Error, removing more items than exist in the user's inventory is not allowed")
        }
        replace_inv[item] = replace_inv[item]-quantity;
        if (replace_inv[item] == 0) {
          delete replace_inv[item]
        }
      }
      replace_inv = JSON.stringify(replace_inv)
      await db.replace("user-"+mention.id, user.bal, replace_inv);
      message.channel.send("Success in removing")
    } else if (message.content.toLowerCase().startsWith(prefix+"createitem")) {
      //createitem [item_name] [price] '[description]'
      let item_name = args[0];
      if (!item_name) {
        return message.channel.send("Missing first parameter, syntax error")
      }
      let price = args[1];
      if (!args[1]) {
        return message.channel.send("Missing second parameter, syntax error");
      } else {
        try {
          price = Number(price);
          if (!price) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second parameter is not a number, syntax error")
        }
      }
      let store = await db.find("store");
      if (!store) {
        await db.insertOne({"id":"store","items":"{}"});
        store = await db.find("store");
      }
      let items = JSON.parse(store.items);
      if (items[item_name]) {
        return message.channel.send("Error, item already exists");
      }
      let description = args.splice(2);
      description = description.join(" ");
      description = description.slice(1,-1);
      items[item_name] = {"price": price, "description": description};
      items = JSON.stringify(items);
      await db.store_change(items);
      message.channel.send("Created item");
    }  else if (message.content.toLowerCase().startsWith(prefix+"deleteitem")) {
      let item_name = args[0];
      let store = await db.find("store");
      if (!store) {
        await db.insertOne({"id":"store","items":"{}"});
        store = await db.find("store");
      }
      let items = JSON.parse(store.items);
      if (!items[item_name]) {
        return message.channel.send("Error, item does not exist");
      }
      delete items[item_name];
      items = JSON.stringify(items);
      await db.store_change(items);
      //delete items in other invs also
      message.channel.send("Item deleted")
    } else if (message.content.toLowerCase().startsWith(prefix+"edititem")) {
      let item_name = args[0];
      if (!item_name) {
        return message.channel.send("Missing first parameter, syntax error")
      }
      let price = args[1];
      if (!args[1]) {
        return message.channel.send("Missing second parameter, syntax error");
      } else {
        try {
          price = Number(price);
          if (!price) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second parameter is not a number, syntax error")
        }
      }
      let store = await db.find("store");
      let items = JSON.parse(store.items);
      if (!items[item_name]) {
        return message.channel.send("Error, item doesn't exist");
      }
      let description = args.splice(2);
      description = description.join(" ");
      description = description.slice(1,-1);
      if (!description) {
        return message.channel.send("Error, no description")
      }
      items[item_name] = {"price": price, "description": description};
      items = JSON.stringify(items);
      await db.store_change(items);
      message.channel.send("Edit success");
    } else if (message.content.toLowerCase().startsWith(prefix+"removemoney")) {
      //removemoney [user @] [amount]
      let mention = message.mentions.users.first();
      if (!mention) {
        return message.channel.send("No one mentioned, invalid syntax")
      }
      let amount = 0;
      if (!args[1]) {
        return message.channel.send("Missing second argument, syntax error")
      } else {
        try {
          amount = Number(args[1])
          if (!amount) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second argument is not a number, error")
        }
      }
      if (amount < 0) {
        return message.channel.send("No negative numbers, error");
      }
      let user = await db.find("user-"+mention.id);
      if (!user) {
        await db.insert("user-"+mention.id, 0, "{}");
        user = await db.find("user-"+mention.id);
        let stakes = await db.find("stakes");
        stakes = JSON.parse(stakes.stakes);
        stakes[mention.id] = {}
        stakes[mention.id][mention.id] = 100;
        stakes = JSON.stringify(stakes);
        await db.stakes_change(stakes);
      }
      let user_bal = user.bal;
      if (amount > user_bal) {
        return message.channel.send("Cannot remove more than user balance")
      }
      user_bal = user_bal-amount;
      await db.replace("user-"+mention.id, user_bal, user.inv);
      message.channel.send("Success, money removed");
    } else if (message.content.toLowerCase().startsWith(prefix+"addmoney")) {
      let mention = message.mentions.users.first();
      if (!mention) {
        return message.channel.send("No one mentioned, invalid syntax")
      }
      let amount = 0;
      if (!args[1]) {
        return message.channel.send("Missing second argument, syntax error")
      } else {
        try {
          amount = Number(args[1])
          if (!amount) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second argument is not a number, error")
        }
      }
      if (amount < 0) {
        return message.channel.send("No negative numbers, error");
      }
      let user = await db.find("user-"+mention.id);
      if (!user) {
        await db.insert("user-"+mention.id, 0, "{}");
        user = await db.find("user-"+mention.id);
        let stakes = await db.find("stakes");
        stakes = JSON.parse(stakes.stakes);
        stakes[mention.id] = {}
        stakes[mention.id][mention.id] = 100;
        stakes = JSON.stringify(stakes);
        await db.stakes_change(stakes);
      }
      let user_bal = Number(user.bal);
      user_bal = user_bal+amount;
      await db.replace("user-"+mention.id, user_bal, user.inv);
      message.channel.send("Success, money added");
    } else if (message.content.toLowerCase().startsWith(prefix+"setbal")) {
      let mention = message.mentions.users.first();
      if (!mention) {
        return message.channel.send("No one mentioned, invalid syntax")
      }
      let amount = 0;
      if (!args[1]) {
        return message.channel.send("Missing second argument, syntax error")
      } else {
        try {
          amount = Number(args[1])
          if (amount === 0) {
          } else if (!amount) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second argument is not a number, error")
        }
      }
      if (amount < 0) {
        return message.channel.send("No negative numbers, error");
      }
      let user = await db.find("user-"+mention.id);
      if (!user) {
        await db.insert("user-"+mention.id, 0, "{}");
        user = await db.find("user-"+mention.id);
        let stakes = await db.find("stakes");
        stakes = JSON.parse(stakes.stakes);
        stakes[mention.id] = {}
        stakes[mention.id][mention.id] = 100;
        stakes = JSON.stringify(stakes);
        await db.stakes_change(stakes);
      }
      let user_bal = user.bal;
      user_bal = amount;
      await db.replace("user-"+mention.id, user_bal, user.inv);
      message.channel.send("Balance set")
    } else if (message.content.toLowerCase().startsWith(prefix+"createincome")) {
      //createincome [role @] [claim every x hours] [amount]
      let role = message.mentions.roles.first();
      if (!role) {
        return message.channel.send("No role mention");
      }
      let claim_every = args[1];
      if (!claim_every) {
        return message.channel.send("Missing second argument, error");
      } else {
        try {
          claim_every = Number(claim_every);
          if (!claim_every) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second argument not number");
        }
      }
      let amount = args[2];
      if (!amount) {
        return message.channel.send("Missing third argument, error");
      } else {
        try {
          amount = Number(amount);
          if (!amount) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Third argument not number");
        }
      }
      let income = await db.find("income");
      if (!income) {
        await db.insertOne({"id":"income","income":"{}"});
        income = await db.find("income");
      }
      income = JSON.parse(income.income);
      if (income[role.id]) {
        return message.channel.send("Error cannot create, role income already exists");
      }
      income[role.id] = {'claim_every': claim_every, 'amount': amount, 'last_claim': Date.now()};
      await db.income_change(JSON.stringify(income));
      message.channel.send("Created role income")
    } else if (message.content.toLowerCase().startsWith(prefix+"deleteincome")) {
      let role = message.mentions.roles.first();
      if (!role) {
        return message.channel.send("Missing role mention");
      }
      let income = await db.find("income");
      if (!income) {
        await db.insertOne({"id":"income","income":"{}"});
        income = await db.find("income");
      }
      income = JSON.parse(income.income);
      if (!income[role.id]) {
        return message.channel.send("Error role income does not exist");
      }
      delete income[role.id];
      await db.income_change(JSON.stringify(income));
      message.channel.send("Deleted role income");
    } else if (message.content.toLowerCase().startsWith(prefix+"editincome")) {
      let role = message.mentions.roles.first();
      if (!role) {
        return message.channel.send("No role mention");
      }
      let claim_every = args[1];
      if (!claim_every) {
        return message.channel.send("Missing second argument, error");
      } else {
        try {
          claim_every = Number(claim_every);
          if (!claim_every) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Second argument not number");
        }
      }
      let amount = args[2];
      if (!amount) {
        return message.channel.send("Missing third argument, error");
      } else {
        try {
          amount = Number(amount);
          if (!amount) {
            return message.channel.send("Second parameter is not a number, syntax error")
          }
        } catch {
          return message.channel.send("Third argument not number");
        }
      }
      let income = await db.find("income");
      if (!income) {
        await db.insertOne({"id":"income","income":"{}"});
        income = await db.find("income");
      }
      income = JSON.parse(income.income);
      if (!income[role.id]) {
        return message.channel.send("Error cannot edit, role income does not exist");
      }
      income[role.id] = {'claim_every': claim_every, 'amount': amount, 'last_claim': income[role.id].last_claim};
      await db.income_change(JSON.stringify(income));
      message.channel.send("Edited role income")
    } else if (message.content.startsWith(prefix+"eval")) {
      if (eval_enabled) {
        eval(args.join(" "));
      }
    }
  }
});

client.login(token);