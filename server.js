const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["https://duetwebrtc.vercel.app"], // Next.js uygulamanızın adresi
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", (data) => {
    console.log("Message received:", data);
    socket.broadcast.emit("message", data); // Gelen mesajı diğer kullanıcılara gönder
  });

  socket.on("join-room", (room) => {
    console.log(`${socket.id} joined room: ${room}`);
    socket.join(room);
    socket.broadcast.to(room).emit("user-joined", { id: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const port = process.env.PORT || 3001; // Eğer PORT tanımlı değilse varsayılan olarak 3001 kullanılır
httpServer.listen(port, () => {
  console.log(`Socket.IO server is running on http://localhost:${port}`);
});