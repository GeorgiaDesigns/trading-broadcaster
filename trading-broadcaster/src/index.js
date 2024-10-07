import WebSocket from "ws";
const axios = require("axios");

const consumers = new Map();

createTradingBroadcastServer();

async function getSymbols(symbols) {
  const uniqueSymbols = [...new Set(symbols)];
  const promises = uniqueSymbols.map(async (id) => {
    const url = `http://localhost:3000/api/symbols/${id}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`Symbol fetch error for ID ${id}:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((symbol) => symbol !== null);
}

function createTradingBroadcastServer() {
  const tradingBroadcastServer = new WebSocket.Server({ port: 9000 });

  tradingBroadcastServer.on("error", (err) => {
    console.error("WebSocket server error: ", err);
  });

  tradingBroadcastServer.on("connection", (ws) => {
    console.log("Client connected");

    consumers.set(ws, {
      providers: [],
      latestPrices: new Map(),
      retrying: false,
    });

    ws.on("message", async (message) => {
      const { action, host, symbols } = JSON.parse(message);

      switch (action) {
        case "add-provider":
          await handleAddProvider(ws, host, symbols);
          break;
        case "clear-providers":
          closeProviders(ws);
          ws.send(JSON.stringify({ status: "processed" }));
          break;
        case "clear-prices":
          consumers.get(ws).latestPrices.clear();
          ws.send(JSON.stringify({ status: "processed" }));
          break;
        default:
          ws.send(
            JSON.stringify({
              status: "not processed",
              message: "Unknown action",
            })
          );
          break;
      }
    });

    ws.on("close", () => {
      const consumerData = consumers.get(ws);
      if (consumerData) {
        consumerData.retrying = false;

        closeProviders(ws);
        consumers.delete(ws);
        console.log(
          `Client disconnected, resources cleaned up. Active consumers: ${consumers.size}`
        );
      }
    });
  });

  return tradingBroadcastServer;
}

function closeProviders(ws) {
  const consumerData = consumers.get(ws);
  if (consumerData) {
    consumerData.providers.forEach((providerSocket) => providerSocket.close());
    consumerData.providers = [];
  }
}

async function handleAddProvider(ws, host, symbols) {
  if (!symbols || symbols.length === 0) {
    return ws.send(
      JSON.stringify({
        status: "not processed",
        message: "No symbols provided",
      })
    );
  }

  const validSymbols = await getSymbols(symbols);
  const validSymbolIDs = new Set(
    validSymbols.map((symbolData) => symbolData.id)
  );

  if (validSymbolIDs.length === 0) {
    return ws.send(
      JSON.stringify({
        status: "not processed",
        message: "Error fetching symbol data",
      })
    );
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

    if (!validSymbolIDs.has(symbol)) return;

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
}

function retryWebSocketConnection(host, ws, retryCount = 0) {
  const consumerData = consumers.get(ws);

  consumerData.retrying = true;

  if (retryCount > 3) {
    consumerData.retrying = false;

    ws.send(
      JSON.stringify({
        status: "not processed",
        message: `error connecting to ${host}`,
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
    consumerData.retrying = false;
    ws.send(
      JSON.stringify({
        status: "processed",
        message: `connected to ${host} after ${retryCount} retry(ies)`,
      })
    );
    consumers.get(ws).providers.push(retrySocket);
  });
}
