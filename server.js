const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const morgan = require("morgan");

const dbConnection = require("./backend/scr/config/db");
const globalError = require("./backend/scr/middlewares/errorMiddleware");
const mountRoutes = require("./backend/scr/routes");

dotenv.config({ path: ".env" });

const app = express();

const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors());

app.use(express.json());
app.use("/users", express.static("uploads/users"));
app.use(express.static("uploads"));

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
// });

// app.use("/api", limiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

dbConnection();
mountRoutes(app);

app.use(globalError);

const server = http.createServer(app);
const io = new Server(server);
global.io = io;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("User joined room:", userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`App running on port ${PORT}...`);
});

process.on("unhandledRejection", (err) => {
  console.error(`UnhandledRejection Errors: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error("Shutting down....");
    process.exit(1);
  });
});
