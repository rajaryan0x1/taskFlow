import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initializeSocket } from "./sockets/task.socket.js";

const server = http.createServer(app);


const io = initializeSocket(server);
app.locals.io = io;

// database connection here 
await connectDB();
server.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log("Socket.io initialized");

})
const shutdown = () => {
    console.log("Shutting down gracefully...");
    server.close(async () => {
        console.log("HTTP server closed");
        const mongoose = await import("mongoose");
        await mongoose.disconnect();
        console.log("MongoDB connection closed");
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
