import { useState } from "react";
import * as nearAPI from "near-api-js";

import classes from "./SignIn.module.scss";

type SignInProps = {
  connection: nearAPI.WalletConnection;
};

export default function SignIn({ connection }: SignInProps) {
  const [signInType, setSignInType] = useState<"full" | "functional">(
    "functional"
  );
  const [contractId, setContractId] = useState<string>("");
  const [methodNames, setMethodNames] = useState<string>("");
  const [successURL, setSuccessUrl] = useState<string>("");
  const [failureURL, setFailureUrl] = useState<string>("");

  const isSignedIn = connection?.isSignedIn();

  async function onSignIn() {
    // Modified connection.requestSignIn method
    // Skipped some validation, allowed Full Access key request
    try {
      const currentUrl = new URL(window.location.href);
      const walletBaseUrl = connection._walletBaseUrl;
      const LOGIN_WALLET_URL_SUFFIX = "/login/";
      const PENDING_ACCESS_KEY_PREFIX = "pending_key";

      const newUrl = new URL(walletBaseUrl + LOGIN_WALLET_URL_SUFFIX);
      newUrl.searchParams.set("success_url", successURL || currentUrl.href);
      newUrl.searchParams.set("failure_url", failureURL || currentUrl.href);

      if (contractId) {
        newUrl.searchParams.set("contract_id", contractId);
      }

      if (contractId || signInType === "full") {
        const accessKey = nearAPI.KeyPair.fromRandom("ed25519");
        newUrl.searchParams.set(
          "public_key",
          accessKey.getPublicKey().toString()
        );
        await connection._keyStore.setKey(
          connection._networkId,
          PENDING_ACCESS_KEY_PREFIX + accessKey.getPublicKey(),
          accessKey
        );
      }

      if (methodNames) {
        methodNames.split(",").forEach((methodName) => {
          newUrl.searchParams.append("methodNames", methodName);
        });
      }

      window.location.assign(newUrl.toString());
    } catch (e: any) {
      window.alert(e.message);
    }
  }

  function onSignOut() {
    connection.signOut();
    window.location.reload();
  }

  return (
    <div className={classes.signIn}>
      {!isSignedIn && (
        <>
          <div className={classes.typeSelector}>
            <legend>Sign In Type:</legend>
            <div>
              <input
                type="radio"
                name="signInType"
                value="functional"
                id="functional-type-radio"
                onChange={() => setSignInType("functional")}
                checked={signInType === "functional"}
              />
              <label htmlFor="functional-type-radio">Functional Key</label>
            </div>
            <div>
              <input
                type="radio"
                name="signInType"
                value="full"
                id="full-type-radio"
                onChange={() => setSignInType("full")}
                checked={signInType === "full"}
              />
              <label htmlFor="full-type-radio">Full Key</label>
            </div>
          </div>

          <div className={classes.signInInputs}>
            {signInType === "functional" && (
              <>
                <input
                  type="text"
                  value={contractId}
                  placeholder="Contract ID"
                  onChange={(e) => setContractId(e.target.value)}
                />
                <input
                  type="text"
                  value={methodNames}
                  placeholder="Method Names (comma separated)"
                  onChange={(e) => setMethodNames(e.target.value)}
                />
              </>
            )}
            <input
              type="text"
              value={successURL}
              placeholder="Success URL (defaults to current page)"
              onChange={(e) => setSuccessUrl(e.target.value)}
            />
            <input
              type="text"
              value={failureURL}
              placeholder="Failure URL (defaults to current page)"
              onChange={(e) => setFailureUrl(e.target.value)}
            />
          </div>
        </>
      )}
      {!isSignedIn && <button onClick={onSignIn}>Sign In</button>}
      {isSignedIn && (
        <div>
          Signed in as: <i>{connection.getAccountId()}</i>
        </div>
      )}
      {isSignedIn && <button onClick={onSignOut}>Sign Out</button>}
    </div>
  );
}
