import regions from "./regions.mjs";
import accounts from "./accounts.mjs";

const SLACK_DEBUG_CHANNEL = "G2QHC11SM"; // #ops-debug
const SLACK_ICON = ":ops-cloudformation:";
const SLACK_USERNAME = "AWS CloudFormation";

function colorForResourceStatus(status) {
  console.log(status);
  return "#000000";
}

export default function message(event) {
  const stackSetArn = event.detail["stack-set-arn"];

  const stackSetID = stackSetArn.split("stackset/")[1];
  const stackSetName = stackSetID.split(":")[0];

  const { action } = event.detail;

  const { status } = event.detail["status-details"];

  const { region } = event;
  const stackUrl = `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacksets/${stackSetID}/info`;

  const deepLinkRoleName = "AdministratorAccess";
  const urlEncodedStackUrl = encodeURIComponent(stackUrl);
  const deepStackUrl = `https://d-906713e952.awsapps.com/start/#/console?account_id=${event.account}&role_name=${deepLinkRoleName}&destination=${urlEncodedStackUrl}`;

  const regionNickname = regions(region);
  const accountNickname = accounts(event.account);
  const header = [
    `*<${deepStackUrl}|${accountNickname} - ${regionNickname} » ${stackSetName}>*`,
    `Stack Set Status Change: ${action} *${status}*`,
  ].join("\n");

  const fallback = `${accountNickname} - ${regionNickname} » Stack Set ${stackSetName} is now ${action} ${status}`;

  const msg = {
    username: SLACK_USERNAME,
    icon_emoji: SLACK_ICON,
    channel: SLACK_DEBUG_CHANNEL,
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

  return msg;
}
