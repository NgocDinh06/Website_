const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
  },
  contact: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^0[1-9][0-9]{8,9}$/, "Số điện thoại không hợp lệ"],
  },
  address1: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
  username: { type: String, required: true, unique: true, trim: true, minlength: 4, maxlength: 30 },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, required: true, enum: ["admin", "user"] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);