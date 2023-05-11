import { useEffect, useState } from "react";
import * as nearAPI from "near-api-js";

import classes from "./NetworkSelector.module.scss";

type NetworkSelectorProps = {
  onConnectionChange: (connection: nearAPI.WalletConnection) => void;
};

export default function NetworkSelector({
  onConnectionChange,
}: NetworkSelectorProps) {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [wallet, setWallet] = useState<"live" | "dev" | "local">("live");

  useEffect(() => {
    async function initConnection() {
      let walletUrl = `https://wallet.${network}.near.org`;
      if (wallet === "dev") {
        walletUrl = `https://dev.nearwt.click/${network}`;
      } else if (wallet === "local") {
        walletUrl = `http://localhost:5000/${network}`;
      }

      const near = await nearAPI.connect({
        keyStore: new nearAPI.keyStores.BrowserLocalStorageKeyStore(),
        networkId: network,
        nodeUrl: `https://rpc.${network}.near.org`,
        walletUrl: walletUrl,
        helperUrl: `https://helper.${network}.near.org`,
      });

      const walletConnection = new nearAPI.WalletConnection(near, "tx-tester");

      onConnectionChange(walletConnection);
    }

    initConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, wallet]);

  return (
    <>
      <div className={classes.walletSelector}>
        <legend>Wallet:</legend>
        <div>
          <input
            type="radio"
            name="wallet"
            value="live"
            id="live-wallet-radio"
            onChange={() => setWallet("live")}
            checked={wallet === "live"}
          />
          <label htmlFor="live-wallet-radio">Live</label>
        </div>
        <div>
          <input
            type="radio"
            name="wallet"
            value="dev"
            id="dev-wallet-radio"
            onChange={() => setWallet("dev")}
            checked={wallet === "dev"}
          />
          <label htmlFor="dev-wallet-radio">Dev</label>
        </div>
        <div>
          <input
            type="radio"
            name="wallet"
            value="local"
            id="local-wallet-radio"
            onChange={() => setWallet("local")}
            checked={wallet === "local"}
          />
          <label htmlFor="local-wallet-radio">Local</label>
        </div>
      </div>
      <div className={classes.networkSelector}>
        <legend>Network:</legend>
        <div>
          <input
            type="radio"
            name="network"
            value="testnet"
            id="testnet-radio"
            onChange={() => setNetwork("testnet")}
            checked={network === "testnet"}
          />
          <label htmlFor="testnet-radio">Testnet</label>
        </div>
        <div>
          <input
            type="radio"
            name="network"
            value="mainnet"
            id="mainnet-radio"
            onChange={() => setNetwork("mainnet")}
            checked={network === "mainnet"}
          />
          <label htmlFor="mainnet-radio">Mainnet</label>
        </div>
      </div>
    </>
  );
}
