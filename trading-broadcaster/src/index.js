import WebSocket from 'ws';

createTradingBroadcastServer();

function createTradingBroadcastServer() {

  const tradingBroadcastServer = new WebSocket.Server({
    port: 9000,
  });

  return tradingBroadcastServer;
}
