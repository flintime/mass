// Socket fallback
export const socketService = {
  sendMessage: () => Promise.resolve(),
  broadcastToRoom: () => Promise.resolve(),
  notifyUser: () => Promise.resolve(),
  notifyBusiness: () => Promise.resolve()
};
