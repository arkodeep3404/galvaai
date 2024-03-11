const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB);

const schema = mongoose.Schema;
const model = mongoose.model;

const userSchema = new schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  isVerified: {
    type: Boolean,
    default: false,
  },
  token: {
    type: String,
    default: "",
  },
});

const User = model("User", userSchema);

module.exports = {
  User,
};
