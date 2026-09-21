const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = "mongodb+srv://bhupendrasahu132004_db_user:YOUR_NEW_PASSWORD@cluster0.h73cu0r.mongodb.net/gigcred?retryWrites=true&w=majority&appName=Cluster0";

    await mongoose.connect(mongoURI);

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;