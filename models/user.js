const mongoose = require("mongoose");
const uniqueValidator=require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },//waaana make sure we have a unique email
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }],
});


userSchema.plugin(uniqueValidator);//make sure we can query our email as fast as possible with unique email

module.exports=mongoose.model('User',userSchema);
//model name=User
//collection name will be set to: users