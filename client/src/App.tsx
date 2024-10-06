import React, { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
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
  "a631dc6c-ee85-458d-80d7-50018aedfbad",
  "9e8bff74-50cd-4d80-900c-b5ce3bf371ee",
  "256c6786-5198-4d11-951b-3cea4e5e6af4",
];

function isStockUpdate(msg: any): msg is StockUpdate {
  return (
    msg &&
    typeof msg.symbol === "string" &&
    typeof msg.price === "number" &&
    typeof msg.quantity === "number" &&
    typeof msg.timestamp === "number"
  );
}

function App() {
  const [stockData, setStockData] = useState<StockUpdate[]>([]);
  const [action, setAction] = useState<Action>();
  const [port, setPort] = useState("9001");

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    "ws://localhost:9000"
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      console.log("WebSocket connection opened");

      switch (action) {
        case Action.ADD: {
          const message: ProviderMessage = {
            action: Action.ADD,
            host: `ws://localhost:${port}`,
            symbols: chosenSymbols,
          };

          sendJsonMessage(message);
          break;
        }
        case Action.CLEAR:
          sendJsonMessage({ action: "clear-providers" });
          break;
        case Action.CLEAR_PRICES:
          sendJsonMessage({ action: "clear-prices" });
          break;
        default:
          break;
      }
    }
  }, [readyState, action, sendJsonMessage, port]);

  useEffect(() => {
    if (isStockUpdate(lastJsonMessage)) {
      console.log("Received stock update:", lastJsonMessage);
      setStockData((prevData) => [...prevData, lastJsonMessage]);
    } else console.log(lastJsonMessage);
  }, [lastJsonMessage]);

  return (
    <div className="App">
      <h1>Stock Updates</h1>
      <ul>
        {isStockUpdate(lastJsonMessage) &&
          stockData.map((stock, index) => (
            <li key={index}>
              Symbol: {stock.symbol}, Price: {stock.price}, Quantity:
              {stock.quantity}, Timestamp:
              {new Date(stock.timestamp * 1000).toLocaleString()}
            </li>
          ))}
      </ul>

      <div>
        Provider port:
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />
        <button onClick={() => setAction(Action.ADD)}>Add provider</button>
        <button onClick={() => setAction(Action.CLEAR)}>Clear providers</button>
        <button onClick={() => setAction(Action.CLEAR_PRICES)}>
          Clear Prices
        </button>
      </div>
    </div>
  );
}

export default App;
