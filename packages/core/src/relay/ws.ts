import { WebsocketHandler } from "./status/index.js";

import { GELATO_API_WS } from "../constants/index.js";

export const statusApiWebSocket = new WebsocketHandler(GELATO_API_WS);
