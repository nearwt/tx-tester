import React, { useState } from "react";
import * as nearAPI from "near-api-js";
import * as BN from "bn.js";

import classes from "./TxGenerator.module.scss";
import { PublicKey } from "near-api-js/lib/utils";

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
}

type Action = {
  id: string;
  type: ActionType;
  deposit?: string;
  methodName?: string;
  args?: string;
  gas?: string;
};

export default function TxGenerator({ connection }: TxGeneratorProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
        { type: ActionType.Transfer, id: Date.now().toString() },
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

  return (
    <form className={classes.container} onSubmit={onSubmitTX}>
      <h1>Transactions Builder</h1>
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
  );
}
