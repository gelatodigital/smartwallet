import { useSendTransaction } from "@gelatonetwork/smartwallet-react-wagmi";
import { useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  const { sendTransactionAsync, data: transactionReference, isPending } = useSendTransaction();

  /*
  const { data: receipt, isPending: isReceiptPending } =
    useWaitForTransactionReceipt({
      id: transactionReference,
    });
  */

  const sendTransactionCallback = useCallback(async () => {
    console.log("Sending transaction...");
    await sendTransactionAsync({
      to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      data: "0x1234"
    });
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
            {transactionReference && <div>Awaiting confirmation: {transactionReference}</div>}

            <button onClick={sendTransactionCallback} type="button">
              Send Transaction
            </button>
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
