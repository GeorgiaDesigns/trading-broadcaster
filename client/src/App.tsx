import React, { useEffect, useState } from "react";
import "./App.css";

export type StockUpdate = {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
};

enum Action {
  ADD = "add-provider",
  CLEAR = "clear-provider",
  CLEAR_PRICES = "clear-prices",
}

type ProviderMessage = {
  action: Action;
  host: string;
  symbols: string[];
};

const chosenSymbols = [
  "a631dc6c-ee85-458d-8d07-50018aedfbad",
  "9e8bff74-50cd-4d80-900c-b5ce3bf371ee",
];

function App() {
  const [stockData, setStockData] = useState<StockUpdate[]>([]);
  const [action, setAction] = useState<Action>();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:9000");

    switch (action) {
      case Action.ADD: {
        const message: ProviderMessage = {
          action: Action.ADD,
          host: "ws://localhost:9001",
          symbols: chosenSymbols,
        };
        ws.send(JSON.stringify(message));
        break;
      }
      case Action.CLEAR:
        ws.send(JSON.stringify({ action: "clear-providers" }));
        break;
      case Action.CLEAR_PRICES:
        ws.send(JSON.stringify({ action: "clear-prices" }));
        break;
    }

    ws.onopen = () => {
      console.log("WebSocket connection opened");
    };

    ws.onmessage = (event) => {
      const stockUpdate: StockUpdate = JSON.parse(event.data);
      console.log("Received stock update:", stockUpdate);

      setStockData((prevData) => [...prevData, stockUpdate]);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [action]);

  return (
    <div className="App">
      <h1>Stock Updates</h1>
      <ul>
        {stockData.map((stock, index) => (
          <li key={index}>
            Symbol: {stock.symbol}, Price: {stock.price}, Quantity:
            {stock.quantity}, Timestamp:
            {new Date(stock.timestamp * 1000).toLocaleString()}
          </li>
        ))}
      </ul>

      <div>
        <button onClick={() => setAction(Action.ADD)}>Add providers</button>
        <button onClick={() => setAction(Action.CLEAR)}>Clear providers</button>
        <button onClick={() => setAction(Action.CLEAR_PRICES)}>
          Clear Prices
        </button>
      </div>
    </div>
  );
}

export default App;
