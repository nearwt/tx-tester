import { useState } from "react";
import * as nearAPI from "near-api-js";

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
}

type Action = {
  id: string;
  type: ActionType;
  deposit?: string;
  receiverId?: string;
  methodName?: string;
  args?: string;
  gas?: string;
};

export default function TxGenerator({ connection }: TxGeneratorProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function onSubmitTX() {
    try {
      console.log(connection);
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
    <div className={classes.container}>
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
                <>
                  {renderActionInput(tx, action, "receiverId", "Receiver ID")}
                  {renderActionInput(tx, action, "deposit", "Amount")}
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
                    "Gas (default to 30)",
                    false
                  )}
                </>
              )}
            </div>
          ))}
          <button onClick={() => addAction(tx)} className={classes.addAction}>
            +
          </button>
        </div>
      ))}
      <button onClick={addTX}>Add TX</button>
    </div>
  );
}
