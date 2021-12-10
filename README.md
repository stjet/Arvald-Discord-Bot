Arvald Bot is a bot that is intended to replace the functionality of Unbelieveable bot and be self hosted. All code is, of course, 100% original. Only works in one server.

Please feel free to fork this, it is licensed under the MIT license, which is very permissive.

This bot is intended to be easy to set up for those with minimal or even no programming knowledge. All that is needed is changing the `setup.json` file, adding a `.env` file with the mongodb password as variable `dbpass`, discord bot token as variable `token`. The connection string in `mongo.js` will also have to be changed.

Requirements: somewhere to run bot (replit.com is a good free option if you do not have the ability to run on your computer or a vps), Nodejs v16 download, mongodb cluster (free tier works fine), discord bot (discord.com/developers)