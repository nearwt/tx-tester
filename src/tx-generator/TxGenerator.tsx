import React, { ChangeEvent, useState } from "react";
import * as nearAPI from "near-api-js";
import * as BN from "bn.js";
import { PublicKey } from "near-api-js/lib/utils";
import {
  fullAccessKey,
  functionCallAccessKey,
} from "near-api-js/lib/transaction";

import classes from "./TxGenerator.module.scss";

type TxGeneratorProps = {
  connection: nearAPI.WalletConnection;
};

type Transaction = {
  id: string;
  receiverId?: string;
  actions: Action[];
};

enum ActionType {
  Transfer = "Transfer",
  FunctionCall = "FunctionCall",
  AddKey = "AddKey",
  RemoveKey = "RemoveKey",
  CreateAccount = "CreateAccount",
  RemoveAccount = "RemoveAccount",
  Stake = "Stake",
  DeployContract = "DeployContract",
}

type Action = {
  id: string;
  type: ActionType;
  deposit: string;
  methodName: string;
  args: string;
  gas: string;
  keyType: "full" | "functional";
  publicKey: string;
  contractId: string;
  methodNames: string;
  allowance: string;
  beneficiaryId: string;
  code: string;
};

export default function TxGenerator({ connection }: TxGeneratorProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [callbackURL, setCallbackUrl] = useState<string>("");
  const [meta, setMeta] = useState<string>("");

  async function onSubmitTX(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const sender = connection.account();

      const txObjects: nearAPI.transactions.Transaction[] = [];
      for (const tx of transactions) {
        const publicKey = (await sender.getAccessKeys())[0].public_key;

        // DO not care, wallet should replace nonce and hash
        const nonce = 1;
        const block = await sender.connection.provider.block({
          finality: "final",
        });
        const blockHash = nearAPI.utils.serialize.base_decode(
          block.header.hash
        );

        const actions = tx.actions.map((action) => {
          if (action.type === ActionType.Transfer) {
            return nearAPI.transactions.transfer(
              new BN(nearAPI.utils.format.parseNearAmount(action.deposit)!)
            );
          }
          if (action.type === ActionType.FunctionCall) {
            return nearAPI.transactions.functionCall(
              action.methodName!,
              JSON.parse(action.args!),
              new BN(action.gas || "30").mul(new BN("1000000000000")), // Convert TGas to Gas
              new BN(
                nearAPI.utils.format.parseNearAmount(action.deposit || "0")!
              )
            );
          }
          if (action.type === ActionType.AddKey) {
            const publicKey = PublicKey.fromString(action.publicKey!);
            if (action.keyType === "full") {
              return nearAPI.transactions.addKey(publicKey, fullAccessKey());
            } else {
              return nearAPI.transactions.addKey(
                publicKey,
                functionCallAccessKey(
                  action.contractId!,
                  action.methodNames!.split(","),
                  action.allowance
                    ? new BN(
                        nearAPI.utils.format.parseNearAmount(action.allowance)!
                      )
                    : undefined
                )
              );
            }
          }

          if (action.type === ActionType.RemoveKey) {
            const publicKey = PublicKey.fromString(action.publicKey!);
            return nearAPI.transactions.deleteKey(publicKey);
          }

          if (action.type === ActionType.CreateAccount) {
            return nearAPI.transactions.createAccount();
          }

          if (action.type === ActionType.RemoveAccount) {
            return nearAPI.transactions.deleteAccount(action.beneficiaryId);
          }

          if (action.type === ActionType.Stake) {
            return nearAPI.transactions.stake(
              new BN(nearAPI.utils.format.parseNearAmount(action.deposit)!),
              PublicKey.fromString(action.publicKey!)
            );
          }

          if (action.type === ActionType.DeployContract) {
            const enc = new TextEncoder();
            const binaryCode = enc.encode(action.code);
            return nearAPI.transactions.deployContract(binaryCode);
          }

          throw new Error("Unsupported action");
        });

        const transaction = nearAPI.transactions.createTransaction(
          sender.accountId,
          PublicKey.fromString(publicKey),
          tx.receiverId!,
          nonce,
          actions,
          blockHash
        );

        txObjects.push(transaction);
      }

      connection.requestSignTransactions({
        transactions: txObjects,
        callbackUrl: callbackURL || undefined,
        meta: meta || undefined,
      });
    } catch (e: any) {
      window.alert(e.message);
    }
  }

  function addTX() {
    setTransactions([
      ...transactions,
      { id: Date.now().toString(), receiverId: "", actions: [] },
    ]);
  }

  function removeTX(id: string) {
    if (window.confirm("Are you sure you want to remove this transaction?")) {
      setTransactions(transactions.filter((tx) => tx.id !== id));
    }
  }

  function updateTX(tx: Transaction) {
    const newTXs = [...transactions];
    const txIndex = newTXs.findIndex((x) => x.id === tx.id);
    newTXs[txIndex] = tx;
    setTransactions(newTXs);
  }

  function addAction(tx: Transaction) {
    updateTX({
      ...tx,
      actions: [
        ...tx.actions,
        {
          type: ActionType.Transfer,
          id: Date.now().toString(),
          keyType: "functional",
          allowance: "",
          args: "",
          contractId: "",
          deposit: "",
          gas: "",
          methodName: "",
          methodNames: "",
          publicKey: "",
          beneficiaryId: "",
          code: "",
        },
      ],
    });
  }

  function updateAction(tx: Transaction, action: Action) {
    const newTXs = [...transactions];
    const txIndex = newTXs.findIndex((x) => x.id === tx.id);
    const actionIndex = newTXs[txIndex].actions.findIndex(
      (x) => x.id === action.id
    );
    newTXs[txIndex].actions[actionIndex] = action;
    setTransactions(newTXs);
  }

  function removeAction(tx: Transaction, actionId: string) {
    if (window.confirm("Are you sure you want to remove this action?")) {
      const newTXs = [...transactions];
      const txIndex = newTXs.findIndex((x) => x.id === tx.id);
      newTXs[txIndex].actions = newTXs[txIndex].actions.filter(
        (action) => action.id !== actionId
      );
      setTransactions(newTXs);
    }
  }

  function onCodeFileSelected(
    tx: Transaction,
    action: Action,
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const code = e.target!.result as string;
      updateAction(tx, { ...action, code: code });
    };
    reader.readAsText(file);
  }

  function renderActionInput(
    tx: Transaction,
    action: Action,
    key: keyof Action,
    label: string,
    required = true
  ) {
    return (
      <input
        type="text"
        value={action[key]}
        placeholder={label}
        required={required}
        onChange={(e) =>
          updateAction(tx, {
            ...action,
            [key]: e.target.value,
          })
        }
      />
    );
  }

  function exportConfig() {
    const exportObj = {
      transactions: transactions,
      meta: meta,
      callbackURL: callbackURL,
    };
    const content = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([content], { type: "text/json" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = "txconfig.json";

    document.body.appendChild(downloadLink);
    downloadLink.click();

    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const configStr = e.target!.result as string;
      const config = JSON.parse(configStr);
      setMeta(config.meta);
      setCallbackUrl(config.callbackURL);
      setTransactions(config.transactions);
    };
    reader.readAsText(file);
  }

  return (
    <>
      <form className={classes.container} onSubmit={onSubmitTX}>
        <h1>Transactions Builder</h1>
        <div className={classes.requestParams}>
          <input
            type="text"
            value={callbackURL}
            placeholder="Callback URL (optional)"
            onChange={(e) => setCallbackUrl(e.target.value)}
          />
          <input
            type="text"
            value={meta}
            placeholder="Meta (optional)"
            onChange={(e) => setMeta(e.target.value)}
          />
        </div>
        {transactions.map((tx, idx) => (
          <div className={classes.transaction} key={tx.id}>
            <div className={classes.txHeader}>
              <h2>Transaction {idx + 1}</h2>
              <button onClick={() => removeTX(tx.id)}>X</button>
            </div>
            <input
              type="text"
              value={tx.receiverId}
              placeholder="Receiver ID"
              required
              onChange={(e) => updateTX({ ...tx, receiverId: e.target.value })}
            />
            <h3>Actions:</h3>
            {tx.actions.map((action) => (
              <div className={classes.action} key={action.id}>
                <div className={classes.actionHeader}>
                  <select
                    onChange={(e) =>
                      updateAction(tx, {
                        ...action,
                        type: e.target.value as ActionType,
                      })
                    }
                    value={action.type}
                  >
                    {Object.keys(ActionType).map((option) => {
                      return (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      );
                    })}
                  </select>
                  <button onClick={() => removeAction(tx, action.id)}>X</button>
                </div>
                {action.type === ActionType.Transfer && (
                  <>{renderActionInput(tx, action, "deposit", "Amount")}</>
                )}
                {action.type === ActionType.RemoveKey && (
                  <>
                    {renderActionInput(tx, action, "publicKey", "Public Key")}
                  </>
                )}
                {action.type === ActionType.DeployContract && (
                  <input
                    type="file"
                    accept=".wasm"
                    required
                    onChange={(e) => onCodeFileSelected(tx, action, e)}
                  />
                )}
                {action.type === ActionType.RemoveAccount && (
                  <>
                    {renderActionInput(
                      tx,
                      action,
                      "beneficiaryId",
                      "Beneficiary Id"
                    )}
                  </>
                )}
                {action.type === ActionType.Stake && (
                  <>
                    {renderActionInput(
                      tx,
                      action,
                      "deposit",
                      "Stake (in NEAR)"
                    )}
                    {renderActionInput(
                      tx,
                      action,
                      "publicKey",
                      "Validator Public Key"
                    )}
                  </>
                )}
                {action.type === ActionType.FunctionCall && (
                  <>
                    {renderActionInput(tx, action, "methodName", "Method Name")}
                    <textarea
                      value={action.args}
                      placeholder="Method Args (JSON)"
                      required
                      onChange={(e) =>
                        updateAction(tx, {
                          ...action,
                          args: e.target.value,
                        })
                      }
                    />
                    {renderActionInput(
                      tx,
                      action,
                      "deposit",
                      "Deposit (optional)",
                      false
                    )}
                    {renderActionInput(
                      tx,
                      action,
                      "gas",
                      "TGas (default to 30 TGas)",
                      false
                    )}
                  </>
                )}
                {action.type === ActionType.AddKey && (
                  <>
                    <div className={classes.keyTypeSelector}>
                      <legend>Key Type:</legend>
                      <div>
                        <input
                          type="radio"
                          name="keyType"
                          value="functional"
                          id="functional-key-type-radio"
                          onChange={() =>
                            updateAction(tx, {
                              ...action,
                              keyType: "functional",
                            })
                          }
                          checked={action.keyType === "functional"}
                        />
                        <label htmlFor="functional-key-type-radio">
                          Functional
                        </label>
                      </div>
                      <div>
                        <input
                          type="radio"
                          name="keyType"
                          value="full"
                          id="full-type-radio"
                          onChange={() =>
                            updateAction(tx, {
                              ...action,
                              keyType: "full",
                            })
                          }
                          checked={action.keyType === "full"}
                        />
                        <label htmlFor="full-key-type-radio">Full</label>
                      </div>
                    </div>
                    <div className={classes.publicKeyInput}>
                      {renderActionInput(tx, action, "publicKey", "Public Key")}
                      <button
                        onClick={() =>
                          updateAction(tx, {
                            ...action,
                            publicKey: nearAPI.KeyPair.fromRandom("ed25519")
                              .getPublicKey()
                              .toString(),
                          })
                        }
                        type="button"
                      >
                        Generate
                      </button>
                    </div>
                    {action.keyType === "functional" && (
                      <>
                        {renderActionInput(
                          tx,
                          action,
                          "contractId",
                          "Contract Id"
                        )}
                        {renderActionInput(
                          tx,
                          action,
                          "methodNames",
                          "Method Names (Optional)",
                          false
                        )}
                        {renderActionInput(
                          tx,
                          action,
                          "allowance",
                          "Allowance (Optional)",
                          false
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
            <button
              onClick={() => addAction(tx)}
              className={classes.addAction}
              type="button"
            >
              +
            </button>
          </div>
        ))}
        <button onClick={addTX} type="button">
          Add TX
        </button>
        <button type="submit" className={classes.submitButton}>
          Send Transactions
        </button>
      </form>
      <div className={classes.importExportControls}>
        <button type="button" onClick={exportConfig}>
          Export
        </button>
        <div>
          <label>Import:&nbsp;</label>
          <input type="file" accept=".json" onChange={(e) => onImport(e)} />
        </div>
      </div>
    </>
  );
}
