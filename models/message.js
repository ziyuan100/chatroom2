const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        chatroom: {
            type: Schema.Types.ObjectId,
            ref: 'Chatroom',
            required: true
        }
    }, 
    { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);