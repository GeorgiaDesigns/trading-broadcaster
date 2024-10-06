import _ from "./_";
// /////////////////////////////////////////////////////////////////////////////
// PLEASE DO NOT MODIFY, RENAME OR REMOVE ANY OF THE CODE ABOVE.
// YOU CAN ADD YOUR OWN CODE TO THIS FILE OR MODIFY THE CODE BELOW TO CHANGE THE MESSAGES SENT FROM THE DATA PROVIDER.
// /////////////////////////////////////////////////////////////////////////////

import WebSocket from "ws";

const messagesConfig = {
  timeToWaitBeforeSendingFirstMessage: 1000,
  timeToWaitBeforeSendingNewMessage: 500,
  numberOfIterations: 1,
  messages: [
    {
      symbol: "a631dc6c-ee85-458d-80d7-50018aedfbad",
      price: 10.58,
      quantity: 500,
      timestampDifference: 0,
    },
    {
      symbol: "9e8bff74-50cd-4d80-900c-b5ce3bf371ee",
      price: 18.58,
      quantity: 1500,
      timestampDifference: 1,
    },
    {
      symbol: "a631dc6c-ee85-458d-80d7-50018aedfbad",
      price: 11.0,
      quantity: 1000,
      timestampDifference: -500,
    },
    {
      symbol: "a631dc6c-ee85-458d-80d7-50018aedfbad",
      price: 15.0,
      quantity: 500,
      timestampDifference: 2,
    },
    {
      symbol: "4",
      price: 9.0,
      quantity: 1000,
      timestampDifference: 3,
    },
  ],
};

const messagesConfig2 = {
  timeToWaitBeforeSendingFirstMessage: 1000,
  timeToWaitBeforeSendingNewMessage: 500,
  numberOfIterations: 1,
  messages: [
    {
      symbol: "256c6786-5198-4d11-951b-3cea4e5e6af4",
      price: 10.58,
      quantity: 500,
      timestampDifference: 0,
    },
    {
      symbol: "256c6786-5198-4d11-951b-3cea4e5e6af4",
      price: 18.58,
      quantity: 1500,
      timestampDifference: 1,
    },
    {
      symbol: "257f9954-bd82-443d-8c6c-3ba81470f76c",
      price: 11.0,
      quantity: 1000,
      timestampDifference: -500,
    },
    {
      symbol: "a631dc6c-ee85-458d-80d7-50018aedfbad",
      price: 17.0,
      quantity: 500,
      timestampDifference: 6,
    },
    {
      symbol: "b102925f-c37a-4adc-b89b-ba68e085b1e8",
      price: 9.5,
      quantity: 1000,
      timestampDifference: 1,
    },
  ],
};

(async () => {
  let dataProviderServer;
  let dataProviderServer2;

  try {
    await Promise.all([
      (dataProviderServer = configureDataProvider(9001, messagesConfig)),
      (dataProviderServer2 = configureDataProvider(9002, messagesConfig2)),
    ]);
  } catch (e) {
    dataProviderServer.close();
    dataProviderServer2.close();
    console.log(e.message);
  }
})();

function configureDataProvider(port, messagesConfig) {
  return new Promise((resolve, reject) => {
    const dataProviderServer = new WebSocket.Server({ port });

    dataProviderServer.on("error", (err) => {
      console.error(`Error on provider at port ${port}:`, err);
      reject(err);
    });

    dataProviderServer.on("listening", () => {
      console.log(`WebSocket server started on port ${port}`);
      resolve(dataProviderServer); // Resolve when the server starts
    });

    dataProviderServer.on("connection", async function (client) {
      console.log(`connected on port ${port}`);

      client.on("error", console.error);

      client.on("message", async function (msg) {
        const data = JSON.parse(msg);
        console.log("message received: ", data);
      });

      client.on("close", function () {
        console.log("client disconnected");
      });

      if (messagesConfig) {
        delay(messagesConfig.timeToWaitBeforeSendingFirstMessage || 5000);

        await sendData(messagesConfig, dataProviderServer);
        console.log("finished sending data");
      }
    });
  });
  return dataProviderServer;
}

async function sendData(messagesConfig, server) {
  const messagesToSend = messagesConfig.messages;
  let now = Date.now();
  for (
    let index = 0;
    index < messagesToSend.length * messagesConfig.numberOfIterations;
    index++
  ) {
    if (index % messagesToSend.length === 0) {
      now = Date.now();
    }

    const data = messagesToSend[index % messagesToSend.length];
    const dataToSend = {
      symbol: data.symbol,
      price: data.price,
      quantity: data.quantity,
      timestamp: now + data.timestampDifference,
    };

    dispatchMessageToAllClients(dataToSend, server);
    console.log(
      `message sent from port ${server.options.port}:  `,
      dataToSend,
      Date.now()
    );

    await delay(messagesConfig.timeToWaitBeforeSendingNewMessage);
  }
}

function dispatchMessageToAllClients(message, server) {
  server.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
