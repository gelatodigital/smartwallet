import { statusApiWebSocket } from "../../ws.js";

export const onError = (
  taskId: string,
  parameters: {
    update: "error";
    callback: (error: Error) => void;
  }
) => {
  const { update, callback } = parameters;

  const errorHandler = (error: Error) => {
    if (update === "error") {
      callback(error);
    }
  };

  statusApiWebSocket.onError(errorHandler);

  statusApiWebSocket.subscribe(taskId).catch((error) => {
    if (update === "error") {
      callback(error);
    }
  });

  // Cleanup function
  return () => {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offError(errorHandler);
  };
};
