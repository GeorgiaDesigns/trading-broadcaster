import React, { useEffect, useState } from "react";
import "./App.css";
import StockDisplay from "./components/stockDisplay";

export type StockUpdate = {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
};

type AddProviderMessage = {
  action: "add-provider";
  host: string;
  symbols: string[];
};

function App() {
  const [stockData, setStockData] = useState<StockUpdate[]>([]);
  const [chosenSymbols, setChosenSymbols] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:9000");

    const sendAddProviderMessage = () => {
      const message: AddProviderMessage = {
        action: "add-provider",
        host: "ws://localhost:9001",
        symbols: chosenSymbols,
      };
      ws.send(JSON.stringify(message));
    };

    ws.onopen = () => {
      console.log("WebSocket connection opened");
      sendAddProviderMessage();
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
  }, [chosenSymbols]);

  console.log(chosenSymbols);
  return (
    <div className="App">
      {/* // <StockDisplay stocks={[]} /> */}
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
        <input type="checkbox" />
        <button
          onClick={() =>
            setChosenSymbols([
              "a631dc6c-ee85-458d-8d07-50018aedfbad",
              "9e8bff74-50cd-4d80-900c-b5ce3bf371ee",
            ])
          }
        >
          Add stocks
        </button>
      </div>
    </div>
  );
}

export default App;
