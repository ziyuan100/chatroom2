// IF RESETTING DB, run userSeed first!
// Seeds DB with 1 chatroom with all 5 seeded users included inside

const mongoose = require('mongoose');
const url = "mongodb://127.0.0.1:27017/chatroom2";
const User = require('../models/user')
const Chatroom = require('../models/chatroom');
const Message = require('../models/message');

mongoose.connect(url)
    .then(() => {
        console.log("Mongo Connection Opened");
    })
    .catch((e) => {
        console.log("ERROR");
        console.log(e)
    })

const seedDB = async () => {
    await Chatroom.deleteMany({});
    const chatroomName = "test"
    const users = await User.find({});
    const chatroom = new Chatroom({name: chatroomName, creator: users[0]});
    for (const user of users){
        chatroom.users.push(user);
        user.chatrooms.push(chatroom);
        await user.save();
        const message = new Message({content: "testing", owner: user, chatroom: chatroom});
        chatroom.messages.push(message);
        await message.save();
    }
    await chatroom.save();
    console.log(chatroom);
}

seedDB().then(() => {
    mongoose.connection.close();
})