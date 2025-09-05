import { sponsored } from "@gelatonetwork/smartwallet";
import {
  useSendTransaction,
  useWaitForTransactionReceipt
} from "@gelatonetwork/smartwallet-react-wagmi";
import { useCallback, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

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
    payment: sponsored()
  });

  const { data: receipt } = useWaitForTransactionReceipt({
    id: taskId
  });

  const sendTransactionCallback = useCallback(async () => {
    setTxError(undefined);
    try {
      await sendTransactionAsync({
        data: "0xd09de08a",
        to: "0xEEeBe2F778AA186e88dCf2FEb8f8231565769C27",
        value: 0n
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
            <button onClick={() => disconnect()} type="button">
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
