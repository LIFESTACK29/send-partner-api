import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(
            process.env.MONGO_URI as string,
            {} as mongoose.ConnectOptions,
        );
        console.log(
            `✅ Send Partner DB connected:`,
        );
    } catch (error) {
        console.error("❌ Send Partner DB connection failed:", error);
        process.exit(1);
    }
};

export default connectDB;
