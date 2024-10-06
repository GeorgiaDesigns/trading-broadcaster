import WebSocket from "ws";

const consumers = new Map();

createTradingBroadcastServer();

const getSymbols = async (symbols) => {
  const uniqueSymbols = [...new Set(symbols)];
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
          if (!symbols || symbols.length === 0) {
            ws.send(
              JSON.stringify({
                status: "not processed",
                message: "No symbols provided",
              })
            );
            return;
          }

          const validSymbols = await getSymbols(symbols);

          const validSymbolIDs = validSymbols.map(
            (symbolData) => symbolData.id
          );

          if (validSymbolIDs.length === 0) {
            ws.send(
              JSON.stringify({
                status: "not processed",
                message: "Error fetching symbol data",
              })
            );

            return;
          }

          const dataProviderSocket = new WebSocket(host);

          dataProviderSocket.on("error", (err) => {
            retryWebSocketConnection(host, ws);
            console.error(err);
          });

          dataProviderSocket.on("open", () => {
            ws.send(
              JSON.stringify({
                status: "processed",
                message: `connected to ${host}`,
              })
            );
            consumers.get(ws).providers.push(dataProviderSocket);
          });

          dataProviderSocket.on("message", (providerMessage) => {
            const stockUpdate = JSON.parse(providerMessage);
            const { symbol, price, timestamp } = stockUpdate;

            if (!validSymbolIDs.includes(symbol)) return;

            //const consumerData = consumers.get(ws);
            consumers.forEach((consumerData, ws) => {
              const latestPrices = consumerData.latestPrices;
              console.log(consumerData);
              if (
                !latestPrices.has(symbol) ||
                timestamp > latestPrices.get(symbol).timestamp
              ) {
                latestPrices.set(symbol, { price, timestamp });

                ws.send(JSON.stringify(stockUpdate));
              }
            });
          });
          break;
        }

        case "clear-providers": {
          const consumerData = consumers.get(ws);
          consumerData.providers.forEach((providerSocket) =>
            providerSocket.close()
          );
          consumerData.providers = [];
          ws.send(JSON.stringify({ status: "processed" }));
          break;
        }

        case "clear-prices": {
          consumers.get(ws).latestPrices.clear();
          ws.send(JSON.stringify({ status: "processed" }));
          break;
        }
        default: {
          ws.send(
            JSON.stringify({
              status: "not processed",
              message: "Unknown action",
            })
          );
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
        console.log(
          `Client disconnected, resources cleaned up. Active consumers: ${consumers.size}`
        );
      }
    });
  });

  return tradingBroadcastServer;
}

function retryWebSocketConnection(host, ws, retryCount = 0) {
  if (retryCount > 3) {
    ws.send(
      JSON.stringify({
        status: "not processed",
        message: `Failed to connect to provider after multiple attempts: ${host}`,
      })
    );
    return;
  }

  const retrySocket = new WebSocket(host);

  retrySocket.on("error", (err) => {
    console.error(`Retry attempt ${retryCount + 1} failed: `, err.message);
    setTimeout(() => {
      retryWebSocketConnection(host, ws, retryCount + 1);
    }, Math.min(1000 * 2 ** retryCount, 10000));
  });

  retrySocket.on("open", () => {
    ws.send(
      JSON.stringify({
        status: "processed",
        message: `connected to ${host} after ${retryCount} retry(ies)`,
      })
    );
    consumers.get(ws).providers.push(retrySocket);
  });
}
