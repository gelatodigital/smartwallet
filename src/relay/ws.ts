import { WebsocketHandler } from "./status/index.js";

import { api } from "../constants/index.js";

export const statusApiWebSocket = new WebsocketHandler(api("ws"));
