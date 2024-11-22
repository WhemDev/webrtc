"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import SimplePeer, { SignalData } from "simple-peer";

const WebRTCChat = () => {
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  // const [peers, setPeers] = useState<{ id: string; peer: SimplePeer.Instance }[]>([]);
  const [roomId] = useState("default-room");
  const userVideo = useRef<HTMLVideoElement>(null);
  const peerVideo = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);

  useEffect(() => {
    const newSocket = io("http://localhost:3001"); // Socket.IO sunucu adresi
    setSocket(newSocket);

    // Gelen mesajları dinle
    const handleMessage = ({ sender, text }: { sender: string; text: string }) => {
      setMessages((prevMessages) => [...prevMessages, { sender, text }]);
    };

    newSocket.on("message", handleMessage);

    // Video ve Ses Akışı
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

        newSocket.emit("join-room", roomId);

        newSocket.on("user-joined", ({ id }: { id: string }) => {
          if (newSocket.id) {
            // const peer = createPeer(id, newSocket.id, stream);
            // setPeers((prev) => [...prev, { id, peer }]);
          } else {
            console.warn("Socket ID is undefined");
          }
        });

        newSocket.on("signal", ({ from, signal }: { from: string; signal: SignalData }) => {
          const peer = addPeer(signal, from, stream);
          if (peer) {
            // setPeers((prevPeers) => [...prevPeers, { id: from, peer }]);
          }
        });
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    return () => {
      newSocket.off("message", handleMessage); // Olay dinleyicisini kaldır
      newSocket.disconnect(); // Socket bağlantısını kapat
    };
  }, [roomId]);

  // Peer oluşturma
  const createPeer = (userToSignal: string, callerID: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socket?.emit("signal", { to: userToSignal, signal });
    });

    peer.on("stream", (stream) => {
      if (peerVideo.current) {
        peerVideo.current.srcObject = stream;
      }
    });

    return peer;
  };

  // Gelen peer'i ekleme
  const addPeer = useCallback(
    (incomingSignal: SignalData, callerID: string, stream: MediaStream) => {
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
      });

      if (!socket) {
        console.error("Socket is not initialized");
        return null;
      }

      peer.on("signal", (signal: SignalData) => {
        socket.emit("signal", { to: callerID, signal });
      });

      peer.on("stream", (stream: MediaStream) => {
        if (peerVideo.current) {
          peerVideo.current.srcObject = stream;
        }
      });

      peer.signal(incomingSignal);

      return peer;
    },
    [socket]
  );

  // Mesaj gönderme
  const sendMessage = () => {
    if (currentMessage.trim() && socket) {
      socket.emit("message", { sender: username, text: currentMessage });
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "You", text: currentMessage },
      ]);
      setCurrentMessage(""); // Mesaj gönderildikten sonra temizle
    }
  };

  return (
    <div>
      {!isUsernameSet ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <h2>Choose a Username</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: "10px", fontSize: "16px", marginRight: "10px" }}
          />
          <button
            onClick={() => {
              if (username.trim()) {
                setIsUsernameSet(true);
              }
            }}
            style={{ padding: "10px 20px", fontSize: "16px" }}
          >
            Start Chat
          </button>
        </div>
      ) : (
        <div>
          <h3>Room ID: {roomId}</h3>
          <video ref={userVideo} autoPlay muted style={{ width: "100%", marginBottom: "10px" }} />
          <video ref={peerVideo} autoPlay style={{ width: "100%", marginBottom: "10px" }} />

          {/* Mesaj Listesi */}
          <div
            style={{
              border: "1px solid black",
              padding: "10px",
              margin: "10px 0",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {messages.map((msg, index) => (
              <div key={index}>
                <strong>{msg.sender}: </strong>
                {msg.text}
              </div>
            ))}
          </div>

          {/* Mesaj Gönderme */}
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={currentMessage}
              className="text-black"
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              style={{ flex: 1 }}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebRTCChat;