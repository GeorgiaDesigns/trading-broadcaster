class WebSocket {
  constructor() {
    this.sentMessages = [];
  }

  send(message) {
    this.sentMessages.push(message);
  }
}

describe("Stock updates test", () => {
  let consumers;
  let validSymbolIDs;
  let dataProviderSocket;

  beforeEach(() => {
    consumers = new Map();
    validSymbolIDs = ["AAPL", "GOOG", "TSLA"];

    dataProviderSocket = {
      on: jest.fn(),
      sendMessage: (providerMessage) => {
        const messageHandler = dataProviderSocket.on.mock.calls.find(
          ([event]) => event === "message"
        )[1];

        messageHandler(providerMessage);
      },
    };
  });

  test("Clients receive updates for newer timestamps", () => {
    const ws1 = new WebSocket();
    const ws2 = new WebSocket();

    consumers.set(ws1, { providers: [], latestPrices: new Map() });
    consumers.set(ws2, { providers: [], latestPrices: new Map() });

    const stockUpdate1 = JSON.stringify({
      symbol: "AAPL",
      price: 150,
      timestamp: 1609459200000,
    }); // Jan 1, 2021
    const stockUpdate2 = JSON.stringify({
      symbol: "AAPL",
      price: 155,
      timestamp: 1609545600000,
    }); // Jan 2, 2021

    dataProviderSocket.on("message", (providerMessage) => {
      const stockUpdate = JSON.parse(providerMessage);
      const { symbol, price, timestamp } = stockUpdate;

      if (!validSymbolIDs.includes(symbol)) return;

      consumers.forEach((consumerData, ws) => {
        const latestPrices = consumerData.latestPrices;

        if (
          !latestPrices.has(symbol) ||
          timestamp > latestPrices.get(symbol).timestamp
        ) {
          latestPrices.set(symbol, { price, timestamp });
          ws.send(JSON.stringify(stockUpdate));
        }
      });
    });

    dataProviderSocket.sendMessage(stockUpdate1);
    // Both ws1 and ws2 should receive the first update
    expect(ws1.sentMessages.length).toBe(1);
    expect(ws2.sentMessages.length).toBe(1);

    // Send the second stock update (newer)
    dataProviderSocket.sendMessage(stockUpdate2);
    // Both ws1 and ws2 should receive the second update since it's newer
    expect(ws1.sentMessages.length).toBe(2);
    expect(ws2.sentMessages.length).toBe(2);
  });

  test("Clients don't receive updates if timestamps are older", () => {
    const ws1 = new WebSocket();
    consumers.set(ws1, {
      providers: [],
      latestPrices: new Map([
        ["AAPL", { price: 150, timestamp: 1609545600000 }],
      ]),
    });

    const olderStockUpdate = JSON.stringify({
      symbol: "AAPL",
      price: 140,
      timestamp: 1609459200000,
    }); // Older than existing

    dataProviderSocket.on("message", (providerMessage) => {
      const stockUpdate = JSON.parse(providerMessage);
      const { symbol, price, timestamp } = stockUpdate;

      if (!validSymbolIDs.includes(symbol)) return;

      consumers.forEach((consumerData, ws) => {
        const latestPrices = consumerData.latestPrices;

        if (
          !latestPrices.has(symbol) ||
          timestamp > latestPrices.get(symbol).timestamp
        ) {
          latestPrices.set(symbol, { price, timestamp });
          ws.send(JSON.stringify(stockUpdate));
        }
      });
    });

    // Send the older stock update
    dataProviderSocket.sendMessage(olderStockUpdate);
    // ws1 should NOT receive this update because the timestamp is older
    expect(ws1.sentMessages.length).toBe(0);
  });
});
