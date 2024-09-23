import regions from "./regions.mjs";
import accounts from "./accounts.mjs";

const SLACK_DEBUG_CHANNEL = "G2QHC11SM"; // #ops-debug
// const SLACK_INFO_CHANNEL = "G2QHBL6UX"; // #ops-info
const SLACK_ICON = ":ops-cloudformation:";
const SLACK_USERNAME = "AWS CloudFormation";

// These colors match events in the CloudFormation console
function colorForResourceStatus(status) {
  const green = [
    "CREATE_COMPLETE",
    "ROLLBACK_COMPLETE",
    "UPDATE_COMPLETE",
    "UPDATE_ROLLBACK_COMPLETE",
  ];

  const yellow = [
    "CREATE_IN_PROGRESS",
    "DELETE_IN_PROGRESS",
    "REVIEW_IN_PROGRESS",
    "ROLLBACK_IN_PROGRESS",
    "UPDATE_IN_PROGRESS",
    "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS",
  ];

  const red = [
    "CREATE_FAILED",
    "DELETE_FAILED",
    "UPDATE_FAILED",
    "ROLLBACK_FAILED",
    "UPDATE_ROLLBACK_FAILED",
    "UPDATE_ROLLBACK_IN_PROGRESS",
    "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS",
  ];

  const grey = ["DELETE_COMPLETE"];

  if (green.includes(status)) {
    return "#2eb886";
  }

  if (yellow.includes(status)) {
    return "#f4f323";
  }

  if (red.includes(status)) {
    return "#a30200";
  }

  if (grey.includes(status)) {
    return "#AAAAAA";
  }

  return "#000000";
}

const concerning = [
  "CREATE_FAILED",
  "DELETE_FAILED",
  "DELETE_IN_PROGRESS",
  "ROLLBACK_COMPLETE",
  "ROLLBACK_FAILED",
  "ROLLBACK_IN_PROGRESS",
  "UPDATE_FAILED",
  "UPDATE_ROLLBACK_COMPLETE",
  "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS",
  "UPDATE_ROLLBACK_FAILED",
  "UPDATE_ROLLBACK_IN_PROGRESS",
  "IMPORT_ROLLBACK_FAILED",
];

export default function message(event) {
  // Each event includes information about the stack where the change is
  // happening. These will be present on both stack status and resource status
  // events.
  const stackId = event.detail["stack-id"];

  // Extract the stack name from the stack ID
  const stackName = stackId.split(":stack/")[1].split("/")[0];

  // Both stack status and resource status events will have a status and reason
  const { status } = event.detail["status-details"];
  const statusReason = event.detail["status-details"]["status-reason"];

  const { region } = event;
  const stackUrl = `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackId}`;

  const deepLinkRoleName = "AdministratorAccess";
  const urlEncodedStackUrl = encodeURIComponent(stackUrl);
  const deepStackUrl = `https://d-906713e952.awsapps.com/start/#/console?account_id=${event.account}&role_name=${deepLinkRoleName}&destination=${urlEncodedStackUrl}`;

  const regionNickname = regions(region);
  const accountNickname = accounts(event.account);
  const header = [
    `*<${deepStackUrl}|${accountNickname} - ${regionNickname} » ${stackName}>*`,
    `Stack Status Change: *${status}*`,
  ].join("\n");

  const fallback = `${accountNickname} - ${regionNickname} » Stack ${stackName} is now ${status}`;

  const msg = {
    username: SLACK_USERNAME,
    icon_emoji: SLACK_ICON,
    channel: "#sandbox2",
    attachments: [
      {
        color: colorForResourceStatus(status),
        fallback,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: header,
            },
          },
        ],
      },
    ],
  };

  // Supress some notifications for Spire stack events
  if (
    status === "UPDATE_COMPLETE" &&
    stackName.startsWith("infrastructure-cd-root-")
  ) {
    return false;
  }

  // Send end-stage and concerning notifications to DEBUG
  if (concerning.includes(status) || status.endsWith("_COMPLETE")) {
    msg.channel = SLACK_DEBUG_CHANNEL;

    if (statusReason) {
      msg.attachments[0].blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `> ${statusReason}`,
        },
      });
    }
    return msg;
  }

  // Send any notifications that
  // include a reason to DEBUG. Reasons are most often provided when there is
  // an issue ("resources failed to create", "handler returned message", etc).
  // But some nominal updates do include reasons.
  // Certain irrelevant reasons are filtered out.
  if (
    statusReason &&
    ![
      "User Initiated",
      "Transformation succeeded",
      "Resource creation Initiated",
      "Requested update required the provider to create a new physical resource",
      "Requested update requires the creation of a new physical resource; hence creating one.",
    ].includes(statusReason)
  ) {
    msg.channel = SLACK_DEBUG_CHANNEL;
    msg.attachments[0].blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> ${statusReason}`,
      },
    });
    return msg;
  }

  return false;
}
