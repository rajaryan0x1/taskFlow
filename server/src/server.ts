import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initializeSocket } from "./sockets/task.socket.js";

const server = http.createServer(app);


const io = initializeSocket(server);
app.locals.io = io;

// database connection here 
connectDB();
server.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log("Socket.io initialized");

})