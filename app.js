const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const url = "mongodb://127.0.0.1:27017/chatroom2";
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('express-flash');
const axios = require('axios');
const { isLoggedIn } = require('./middleware');

const User = require('./models/user');
const Chatroom = require('./models/chatroom');
const Message = require('./models/message');

const passport = require('passport');
const LocalStrategy = require('passport-local');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

mongoose.connect(url)
    .then(() => {
        console.log("Mongo Connection Opened");
    })
    .catch((e) => {
        console.log("ERROR");
        console.log(e);
    })

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));
app.use(flash());

const sessionConfig = {
    secret: 'changethissecretsoon',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60  * 60 * 24 * 7,
        maxAge: 1000 * 60  * 60 * 24 * 7,
    }
}
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    // console.log(req.user);
    res.locals.currentUser = req.user;
    next();
})

app.get('/', (req, res) => {
    res.render('home');
})

app.get('/register', (req, res) => {
    res.render('register');
})

app.post('/register', async (req, res, next) => {
    const { username, password } = req.body;
    const user = new User({username: username});
    const newUser = await User.register(user, password);
    req.login(newUser, (err) => {
        // TODO error handling for login after register
        if (err){
            return next(err);
        }
        else{
            res.redirect('/');
        }
    })
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    res.redirect('/chat');
})

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        // TODO proper error handling for logout error
        if (err){
            return next(err);
        }
        res.redirect('/login');
    });
})

app.get('/chat', isLoggedIn, async (req, res) => {

    // const chatrooms = await req.user.populate('chatrooms');
    // for (chatroom of req.user.chatrooms){
    //     await chatroom.populate([
    //         'users',
    //         {
    //             path: 'messages',
    //             populate: { path: 'owner'}
    //         }
    //     ])
    // }

    const chatrooms = await req.user.populate({
        path: 'chatrooms',
        populate: [
            {path: 'users'},
            {
                path: 'messages',
                populate: {path: 'owner'}
            }
        ]
    })

    // console.log(req.user.chatrooms[0])
    res.render('chat');
})

app.post('/chat', isLoggedIn, async (req, res) => {
    const { chatroom, content } = req.body;
    const newMessage = new Message({ content, chatroom, owner: req.user._id });
    const currentChatroom = await Chatroom.findOne({ _id: chatroom });
    currentChatroom.messages.push(newMessage);
    await currentChatroom.save();
    await newMessage.save();
    await newMessage.populate("owner");
    res.send(newMessage);
    io.emit('message', {newMessage, chatroom});
})

app.post('/enterChat', isLoggedIn, async (req, res) => {
    const { id } = req.body 
    // console.log(id);
    const currentChatroom = await Chatroom.findOne({_id: id}).populate({
        path: 'messages',
        populate: {
            path: 'owner'
        }
    });
    res.send(currentChatroom)
})

app.get('/newChat', isLoggedIn, (req, res) => {
    res.render('newchat');
})

app.post('/newChat', isLoggedIn, async (req, res) => {
    const { name, creator, users } = req.body;
    const newChat = new Chatroom({
        name,
        creator,
        users
    });
    users.forEach(async (user) => {
        const tempUser = await User.findOne({_id: user});
        tempUser.chatrooms.push(newChat);
        await tempUser.save();
    })
    await newChat.save(); 
    res.send(newChat)
})

app.post('/searchUser', isLoggedIn, async (req, res) => {
    const { searchedUser } = req.body;
    const foundUser = await User.findOne({username: searchedUser});
    if (foundUser && foundUser != req.user){
        res.json(foundUser)
    }
    else {
        res.status(404);
        res.json(foundUser);
        // TODO EXCEPTION HANDLING
    }
})
 
app.post('/leaveChat', isLoggedIn, async (req, res) => {
    const { chatId } = req.body;
    await User.updateOne(
        {_id: req.user._id}, 
        {$pull: {
            chatrooms: chatId
        }}
    )
    
    const chatroom = await Chatroom.findOne({_id: chatId});
    // if user is the last member in the chatroom, when user leaves, chatroom should be deleted
    if (chatroom.users.length === 1){
        await Chatroom.deleteOne({_id: chatId});
    }
    else {
        await Chatroom.updateOne(
            {_id: chatId},
            {$pull: {
                users: req.user._id
            }}
        )
    }
    // TAKE NOTE: using axios post, you will not be able to redirect via server-side. Same issue with post/newChat
    // Why tf does res.send let me proceed to next line in the leaveChat function but res.status doesnt??
    res.send("Success")
})

server.listen(3000, () => {
    console.log("listening on 3000");
})
