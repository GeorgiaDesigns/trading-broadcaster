import React, { useEffect, useState } from "react";
import { StockUpdate } from "../App";

type StockDisplayProps = {
  stocks: StockUpdate[];
};

const StockDisplay = ({ stocks }: StockDisplayProps) => {
  const [data, setData] = useState(null);

  return (
    <div className="App">
      <div className="stockDisplay">
        {stocks.map((s) => (
          <div key={s.symbol}>
            {s.symbol}: {s.price}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockDisplay;
