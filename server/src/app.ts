import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js'
import { connectDB } from './config/db.js';
import morgan from 'morgan';

import mainRouter from './routes/index.js';

const app = express()
app.use(cors({
    origin : "*",
    credentials : true
}))
app.use(helmet())
app.use(express.json()) 

if(env.NODE_ENV === "production"){
    app.use(morgan("dev"))
}

app.use("/api/v1" , mainRouter)


// connectDB(); currently not connecting to db as we are just testing the server
app.get("/health" , (req , res) => {
    res.status(200).json({message : "Server is healthy"})
})










