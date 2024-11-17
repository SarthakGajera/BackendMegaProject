//app.js should be responsible for creating and configuring the Express application, setting up routes, middleware, etc.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.ORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser())


import userRouter from './routes/user.routes.js'
app.use("/api/v1/users",userRouter)



export { app };
