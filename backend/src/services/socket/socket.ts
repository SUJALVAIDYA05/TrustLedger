import { Server, Socket, ExtendedError } from "socket.io";
import { Server as HttpServer } from "http";
import { prisma } from "../../lib/prisma";
import jwt from "jsonwebtoken";

interface AuthenticatedSocket extends Socket {
  data: Socket["data"] & {
    user: { userId: string; role: string };
  };
}

export function initSocketIO(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || "*" },
  });

  io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
    const token = (socket.handshake.auth as { token?: string })?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
        role: string;
      };

      (socket as AuthenticatedSocket).data.user = decoded;
      next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId } = authSocket.data.user;

    authSocket.on("join_dispute", async (disputeId: string) => {
      try {
        const dispute = await prisma.dispute.findUnique({
          where: { id: disputeId },
          include: { project: true },
        });

        if (!dispute) return;

        if (dispute.project.clientId !== userId && dispute.project.freelancerId !== userId) {
          return;
        }

        authSocket.join(`dispute-${disputeId}`);
      } catch (error) {
        console.error("Socket error joining dispute:", error);
      }
    });

    authSocket.on("send_message", async (data: { disputeId: string; body: string }) => {
      const { disputeId, body } = data;

      try {
        const dispute = await prisma.dispute.findUnique({
          where: { id: disputeId },
          include: { project: true },
        });

        if (!dispute) return;
        if (dispute.project.clientId !== userId && dispute.project.freelancerId !== userId) return;

        const msg = await prisma.disputeMessage.create({
          data: {
            disputeId,
            senderId: userId,
            body,
          },
          include: { sender: true },
        });

        io.to(`dispute-${disputeId}`).emit("receive_message", msg);
      } catch (error) {
        console.error("Socket error processing dispute message:", error);
      }
    });

    authSocket.on("disconnect", () => {});
  });

  return io;
}
