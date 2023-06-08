// Seeds DB with 5 users [user1, user2, user3, user4, user5] with the same password [123], for testing purposes

const mongoose = require('mongoose');
const url = "mongodb://127.0.0.1:27017/chatroom2";
const User = require('../models/user')

mongoose.connect(url)
    .then(() => {
        console.log("Mongo Connection Opened");
    })
    .catch((e) => {
        console.log("ERROR");
        console.log(e)
    })

const seedDB = async () => {
    const password = "123";
    await User.deleteMany({});
    for (let i = 1; i <= 5; i++){
        const user = new User({username: `user${i}`});
        await User.register(user, password);
        console.log(user);
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})