import type { ClientOptions, ErrorEvent, MessageEvent } from "isomorphic-ws";
import WebSocket from "isomorphic-ws";

import { api } from "../../constants/index.js";
import type {
  ErrorWebsocketMessage,
  TransactionStatusResponse,
  UpdateWebsocketMessage,
  WebsocketMessage
} from "./types.js";
import { WebsocketEvent } from "./types.js";
import { isFinalTaskState } from "./utils.js";

class WebsocketHandler {
  readonly #url: string;
  readonly #config: ClientOptions | undefined;
  readonly #subscriptions: Set<string> = new Set();
  #updateHandlers: ((taskStatus: TransactionStatusResponse) => void)[] = [];
  #errorHandlers: ((error: Error) => void)[] = [];
  #websocket?: WebSocket;
  readonly #reconnectIntervalMillis = 1000;
  readonly #connectTimeoutMillis = 10000;

  constructor(url: string, config?: ClientOptions) {
    this.#url = `${url}/tasks/ws/status`;
    this.#config = config;
  }

  public onUpdate(handler: (taskStatus: TransactionStatusResponse) => void): void {
    if (!handler) {
      throw new Error("Callback handler is not provided");
    }

    this.#updateHandlers.push(handler);

    this._connect();
  }

  public offUpdate(handler: (taskStatus: TransactionStatusResponse) => void): void {
    if (!handler) {
      throw new Error("Callback handler is not provided");
    }

    this.#updateHandlers = this.#updateHandlers.filter((element) => element !== handler);

    this._disconnectIfUnused();
  }

  public onError(handler: (error: Error) => void): void {
    if (!handler) {
      throw new Error("Callback handler is not provided");
    }

    this.#errorHandlers.push(handler);

    this._connect();
  }

  public offError(handler: (error: Error) => void): void {
    if (!handler) {
      throw new Error("Callback handler is not provided");
    }

    this.#errorHandlers = this.#errorHandlers.filter((element) => element !== handler);

    this._disconnectIfUnused();
  }

  public async subscribe(taskId: string) {
    if (this.#subscriptions.has(taskId)) {
      return;
    }

    this.#subscriptions.add(taskId);

    await this._sendWebsocketMessage({
      action: "subscribe",
      taskId
    });
  }

  public async unsubscribe(taskId: string) {
    if (!this.#subscriptions.has(taskId)) {
      return;
    }

    this.#subscriptions.delete(taskId);

    await this._sendWebsocketMessage({
      action: "unsubscribe",
      taskId
    });
  }

  public hasHandlers(): boolean {
    return this.#updateHandlers.length > 0 || this.#errorHandlers.length > 0;
  }

  private _connect() {
    if (this.#websocket) {
      return;
    }

    this.#websocket = new WebSocket(this.#url, this.#config);

    this.#websocket.onopen = async () => {
      for (const taskId of this.#subscriptions) {
        this._sendWebsocketMessage({
          action: "subscribe",
          taskId
        });
      }
    };

    this.#websocket.onclose = () => {
      setTimeout(() => {
        this._reconnect();
      }, this.#reconnectIntervalMillis);
    };

    this.#websocket.onerror = (event: ErrorEvent) => {
      this._handleError(event.error);
    };

    this.#websocket.onmessage = async (data: MessageEvent) => {
      const message = JSON.parse(data.data.toString()) as WebsocketMessage<unknown>;

      switch (message.event) {
        case WebsocketEvent.ERROR: {
          const errorWebsocketMessage = message as ErrorWebsocketMessage;
          const error: Error = errorWebsocketMessage.payload;

          this._handleError(error);

          break;
        }
        case WebsocketEvent.UPDATE: {
          const updateWebsocketMessage = message as UpdateWebsocketMessage;
          const taskStatus: TransactionStatusResponse = updateWebsocketMessage.payload;

          for (const handler of this.#updateHandlers) {
            handler(taskStatus);
          }

          if (isFinalTaskState(taskStatus.taskState)) {
            await this.unsubscribe(taskStatus.taskId);
          }
          break;
        }
        default: {
          break;
        }
      }
    };
  }

  private async _sendWebsocketMessage(message: unknown): Promise<void> {
    const isConnected = await this._ensureIsConnected();
    if (isConnected && this.#websocket) {
      this.#websocket.send(JSON.stringify(message));
    }
  }

  private _disconnectIfUnused(): void {
    if (this.#updateHandlers.length === 0 && this.#errorHandlers.length === 0 && this.#websocket) {
      this._disconnect();
    }
  }

  private _disconnect(): void {
    if (this.#websocket) {
      if (this.#websocket.readyState === WebSocket.OPEN) {
        this.#websocket.close();
      }
      this.#websocket = undefined;
    }
  }

  private _reconnect(): void {
    this._disconnect();
    this._connect();
  }

  private async _ensureIsConnected(): Promise<boolean> {
    if (!this.#websocket) {
      this._connect();
    } else if (
      this.#websocket.readyState !== WebSocket.CONNECTING &&
      this.#websocket.readyState !== WebSocket.OPEN
    ) {
      this._reconnect();
    }
    return await this._awaitConnection();
  }

  private async _awaitConnection(): Promise<boolean> {
    const start = Date.now();
    while (!this.#websocket || this.#websocket.readyState !== WebSocket.OPEN) {
      const elapsed = Date.now() - start;
      if (elapsed > this.#connectTimeoutMillis) {
        this._handleError(new Error(`Timeout connecting to ${this.#url} after ${elapsed}ms`));

        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return true;
  }

  private _handleError(error: Error) {
    for (const handler of this.#errorHandlers) {
      handler(error);
    }
  }
}

export const statusApiWebSocket = new WebsocketHandler(api("ws"));
