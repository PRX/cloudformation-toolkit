// Receives notifications related to CloudFormation stack changes, and prepares
// Slack messages for them. The messages are sent to the Slack Message Relay
// event bus in order to be sent to Slack. Messages about the stack being
// updated directly are sent to the info channel, and other messages are sent
// to the debug channel
//
// These notifications may come from any region or any account.

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import resourceStatusChangeMessage from "./resource-status-change.mjs";
import stackSetMessage from "./stack-set-change.mjs";
import stackStatusChangeMessage from "./stack-status-change.mjs";

const eventbridge = new EventBridgeClient({ apiVersion: "2015-10-07" });

export const handler = async (event) => {
  console.log(JSON.stringify(event));

  let message;

  if (event["detail-type"].includes("CloudFormation StackSet")) {
    message = stackSetMessage(event);
  } else if (event["detail-type"] === "CloudFormation Stack Status Change") {
    message = stackStatusChangeMessage(event);
  } else if (event["detail-type"] === "CloudFormation Resource Status Change") {
    message = resourceStatusChangeMessage(event);
  }

  if (message) {
    await eventbridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "org.prx.cloudformation-notifications",
            DetailType: "Slack Message Relay Message Payload",
            Detail: JSON.stringify(message),
          },
        ],
      }),
    );
  }
};
