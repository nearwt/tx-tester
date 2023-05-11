import { useState } from "react";
import * as nearAPI from "near-api-js";

import classes from "./App.module.scss";
import NetworkSelector from "./network-selector/NetworkSelector";
import SignIn from "./sign-in/SignIn";
import TxGenerator from "./tx-generator/TxGenerator";

function App() {
  const [connection, setConnection] = useState<nearAPI.WalletConnection | null>(
    null
  );

  return (
    <div className={classes.container}>
      <NetworkSelector
        onConnectionChange={(connection) => setConnection(connection)}
      />
      {connection && <SignIn connection={connection} />}
      {connection && connection.isSignedIn() && (
        <TxGenerator connection={connection} />
      )}
    </div>
  );
}

export default App;
