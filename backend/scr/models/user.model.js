const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    passwordChangedAt: Date,
    role: {
      type: String,
      enum: ["manager", "team-lead", "developer"],
      default: "developer",
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    profileImg: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

userSchema.post("init", function (doc) {
  if (doc.profileImg) {
    doc.profileImg = `${process.env.BASE_URL}/users/${doc.profileImg}`;
  }
});

userSchema.post("save", function (doc) {
  if (doc.profileImg) {
    doc.profileImg = `${process.env.BASE_URL}/users/${doc.profileImg}`;
  }
});

module.exports = mongoose.model("User", userSchema);
