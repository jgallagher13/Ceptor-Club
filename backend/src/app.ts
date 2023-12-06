import express, { Application, Request, Response } from "express";
import cors from "cors";
require("dotenv").config();
import ethers from "ethers";
import { runMiddleware } from "./auth";
import { getImages } from "./utils/getImages";
import { getUser, saveUser, updateNFTVotes, getHighestVotedNFT } from "./utils/mongo";
 
const app: Application = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

app.use(cors()); // Open requests
app.use(express.json());
app.use(runMiddleware);

// use middleware with socket.io to parse incoming requests with JSON payloads
io.use((socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (token !== process.env.API_KEY) {
    return next(new Error("unauthorized"));
  }
  socket.token = token;
  next();
});

// test socket
app.get("/", (req, res) => {
  io.emit("test", "test");
  res.send("test should have been successful");
});

app.get("/user", async (req, res) => {
  const user = await getUser(req.query.wallet as string);
  user ? res.send(user) : res.send("user not found");
});

app.post("/user", async (req, res) => {
  const user = await saveUser(req.body);
  res.send(user);
});

// new endpoint to update NFT votes
app.put("/update-nft-votes", async (req: Request, res: Response) => {
  try {
    const nft_id = req.body as string;
    const modifiedCount = await updateNFTVotes(nft_id);
    res.json({ modifiedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update NFT votes" });
  }
});

// new endpoint to get the highest-voted NFT
app.get("/highest-voted-nft/:weekTimestamp", async (req: Request, res: Response) => {
  try {
    const weekTimestamp = parseInt(req.params.weekTimestamp, 10);
    const highestVotedNFT = await getHighestVotedNFT(weekTimestamp);
    res.json(highestVotedNFT);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve highest-voted NFT" });
  }
});

io.on("connection", (socket: any) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  socket.on("test", (message: any) => {
    console.log("Message received:", message);
  });

  socket.on("imageRequest", (data: any) => {
    console.log("image request received", data);
    getImages(data).then((response: any) => {
      console.log("response from getImages", response);
      socket.emit("imageResponse", response);
    });
  });
});

server.listen(process.env.PORT, () =>
  console.log(`Server Running on ${process.env.PORT}`)
);
