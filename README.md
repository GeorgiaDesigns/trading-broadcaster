# Trading Broadcaster

A real-time trading data broadcasting service that leverages WebSocket technology and Node.js to fetch data from various financial data providers and transmit it to multiple clients. This service is designed to deliver up-to-the-second market information, keeping connected clients continuously updated.

## Table of Contents

Overview
Features
Technologies
Installation
Usage
API Endpoints
WebSocket Events -- soon to be updated --

## Overview

The Trading Broadcaster application is built to handle real-time data streams for trading platforms, financial dashboards, or any application that requires live market data. This system retrieves financial data from multiple providers and emits updates to connected clients, ensuring minimal latency and efficient distribution through WebSockets.

## Features

Real-Time Data: Fetches and broadcasts market data with minimal delay.
Multi-Provider Integration: Aggregates data from various data sources for comprehensive market insights.
WebSocket Connections: Supports simultaneous connections with multiple clients, ensuring efficient data distribution.
Scalable Architecture: Designed to handle high-frequency updates and large numbers of concurrent connections.

Technologies
Node.js: Backend server framework for scalable applications.
WebSocket: Communication protocol for real-time client-server interaction.
Express.js: Lightweight Node.js framework to manage API endpoints and HTTP requests.
Financial Data Providers: data-providers file with mock data

## Installation

This solution requires NodeJs v16 installed.

To build the solution just install the nodejs dependencies

```shell
npm install
```

After finishing your challenge make sure the the build step is working.

## Run solution locally

To run the solution locally just run this command

```shell
npm start
```

## API Endpoints

Endpoint Method Description
/data/start POST Initiates data fetching and broadcasting
/data/stop POST Stops data broadcasting
/status GET Checks server and connection status
WebSocket Events
marketData: Broadcasts live trading data updates.
error: Informs clients of any connection or data issues.
