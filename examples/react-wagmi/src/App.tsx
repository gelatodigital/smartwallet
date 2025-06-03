import { sponsored } from "@gelatonetwork/smartwallet";
import {
  useSendTransaction,
  useWaitForTransactionReceipt
} from "@gelatonetwork/smartwallet-react-wagmi";
import { useState } from "react";
import { useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  const [txError, setTxError] = useState<string | undefined>(undefined);

  const {
    sendTransactionAsync,
    data: taskId,
    isPending
  } = useSendTransaction({
    payment: sponsored(sponsorApiKey)
  });

  const { data: receipt } = useWaitForTransactionReceipt({
    id: taskId
  });

  const sendTransactionCallback = useCallback(async () => {
    setTxError(undefined);
    try {
      await sendTransactionAsync({
        to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        data: "0x1234"
      });
      // biome-ignore lint/suspicious/noExplicitAny: example any error
    } catch (error: any) {
      setTxError(error.message ?? "Unknown error");
    }
  }, [sendTransactionAsync]);

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <div style={{ marginTop: 60 }}>
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>
            <h2>Send test transaction</h2>
            {isPending && <div>Sending transaction...</div>}

            {taskId && !receipt && <div>Awaiting confirmation for Task ID: {taskId}</div>}

            {receipt && (
              <div>
                Receipt: {receipt.status} - Tx Hash: {receipt.transactionHash}
              </div>
            )}

            <button onClick={sendTransactionCallback} type="button">
              Send Transaction
            </button>

            {txError && <p>Error occured: {txError}</p>}
          </div>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button key={connector.uid} onClick={() => connect({ connector })} type="button">
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>
    </>
  );
}

export default App;
