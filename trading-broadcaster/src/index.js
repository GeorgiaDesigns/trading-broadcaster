import WebSocket from "ws";

const consumers = new Map();

createTradingBroadcastServer();

const getSymbols = async (symbols) => {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.id))]; // Filter unique symbols
  const promises = uniqueSymbols.map(async (id) => {
    const url = `http://localhost:3000/api/symbols/${id}`;
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(
          `Error fetching symbol: ${id} - Status: ${response.status}`
        );
      const json = await response.json();
      return json;
    } catch (error) {
      console.error(`Symbol fetch error for ID ${id}:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(promises);

  return results.filter((symbol) => symbol !== null);
};

function createTradingBroadcastServer() {
  const tradingBroadcastServer = new WebSocket.Server({ port: 9000 });

  tradingBroadcastServer.on("error", (err) => {
    console.error("WebSocket server error: ", err);
  });

  tradingBroadcastServer.on("connection", (ws) => {
    console.log("Client connected");

    consumers.set(ws, { providers: [], latestPrices: new Map() });

    ws.on("message", async (message) => {
      const { action, host, symbols } = JSON.parse(message);

      switch (action) {
        case "add-provider": {
          if (!symbols || symbols.length === 0) return;

          const validSymbols = await getSymbols(symbols);
          const validSymbolIDs = validSymbols.map(
            (symbolData) => symbolData.id
          );

          if (validSymbolIDs.length === 0) {
            console.warn(
              "No valid symbols found, skipping provider connection."
            );
            return;
          }

          const dataProviderSocket = new WebSocket(host);

          dataProviderSocket.on("error", (err) => {
            console.error("Data provider connection error:", err.message);
            dataProviderSocket.close();
          });

          dataProviderSocket.on("open", () => {
            console.log("Connected to data provider:", host);
          });

          dataProviderSocket.on("message", (providerMessage) => {
            const stockUpdate = JSON.parse(providerMessage);
            const { symbol, price, timestamp } = stockUpdate;

            if (!validSymbolIDs.includes(symbol)) return;

            const consumerData = consumers.get(ws);
            const latestPrices = consumerData.latestPrices;

            if (
              !latestPrices.has(symbol) ||
              timestamp > latestPrices.get(symbol).timestamp
            ) {
              latestPrices.set(symbol, { price, timestamp });

              ws.send(JSON.stringify(stockUpdate));
            }
          });

          consumers.get(ws).providers.push(dataProviderSocket);

          break;
        }

        case "clear-providers": {
          const consumerData = consumers.get(ws);
          consumerData.providers.forEach((providerSocket) =>
            providerSocket.close()
          );
          consumerData.providers = [];
          console.log("Cleared all providers for this consumer");
          break;
        }

        case "clear-prices": {
          consumers.get(ws).latestPrices.clear();
          ws.send(JSON.stringify({ action: "clear-prices" }));
          console.log("Cleared all prices for this consumer");
          break;
        }
      }
    });

    ws.on("close", () => {
      const consumerData = consumers.get(ws);
      if (consumerData) {
        consumerData.providers.forEach((providerSocket) =>
          providerSocket.close()
        );
        consumers.delete(ws);
        console.log("Client disconnected, resources cleaned up.");
      }
    });
  });

  return tradingBroadcastServer;
}
