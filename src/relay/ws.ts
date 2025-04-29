import { WebsocketHandler } from "./status/index.js";

import { apiWs } from "../constants/index.js";

export const statusApiWebSocket = new WebsocketHandler(apiWs());
