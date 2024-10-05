import WebSocket from "ws";

createTradingBroadcastServer();

const getSymbols = async (symbol) => {
  const url = `http://localhost:3000/api/symbols/${symbol.id} `;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
  }
};

function createTradingBroadcastServer() {
  const tradingBroadcastServer = new WebSocket.Server({
    port: 9000,
  });

  tradingBroadcastServer.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
      const { action, host, symbols } = JSON.parse(message);

      switch (action) {
        case "add-provider": {
          if (!symbols || symbols.length === 0) return;

          let symbolID = [];

          symbols.forEach((symbol) => {
            symbolID.push(getSymbols(symbol));
          });

          const dataProviderSocket = new WebSocket(host);

          dataProviderSocket.on("message", (providerMessage) => {
            const stockUpdate = JSON.parse(providerMessage);

            console.log("Relaying stock update to consumer:", stockUpdate);

            ws.send(JSON.stringify(stockUpdate));
          });
        }
        case "clear-providers": {
          break;
        }
        case "clear-prices": {
          ws.send(JSON.stringify({ action: "clear-prices" }));
        }
      }
    });

    ws.on("close", () => {
      console.log("Connection with Consumer closed");
    });
  });

  return tradingBroadcastServer;
}
