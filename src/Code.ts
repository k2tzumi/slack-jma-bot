import { Slack } from "./slack/types/index.d";
import { SlackHandler } from "./SlackHandler";
import { SlashCommandFunctionResponse } from "./SlashCommandHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { JobBroker } from "./JobBroker";
import { JmaClient } from "./JmaClient";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type Commands = Slack.SlashCommand.Commands;

const asyncLogging = (): void => {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((parameter: Record<string, any>) => {
    console.info(JSON.stringify(parameter));
  });
};

const properties = PropertiesService.getScriptProperties();
const VERIFICATION_TOKEN: string =
  properties.getProperty("VERIFICATION_TOKEN") || "";
const COMMAND = "/jma";

function doPost(e: DoPost): TextOutput {
  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCommandListener(COMMAND, executeSlashCommand);

  try {
    const process = slackHandler.handle(e);

    if (process.performed && process.output) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      new JobBroker().enqueue(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const executeSlashCommand = (
  commands: Commands
): SlashCommandFunctionResponse => {
  const params = commands.text.split(" ");
  if (params.length < 2) {
    return createUsageResponse();
  }
  const [command, place, ...options] = params;

  switch (command) {
    case "tenki":
      return createForecastResponse(place, options);
    case "ame":
    case "bousai":
    case "help":
    default:
      return createUsageResponse();
  }
};

function createUsageResponse(): SlashCommandFunctionResponse {
  return {
    response_type: "ephemeral",
    text: `*Usage*\n* ${COMMAND} [tenki|ame|bousai] place\n* ${COMMAND} help`,
  };
}

function createForecastResponse(
  place: string,
  options?: string[]
): SlashCommandFunctionResponse {
  const pathCode = findPathCode(place);

  if (pathCode) {
    const overviewForecast = new JmaClient().getOverviewForecast(pathCode);
    return {
      response_type: "in_channel",
      text: overviewForecast.text,
    };
  } else {
    return {
      response_type: "ephemeral",
      text: `Not fund place.\`${place}\`.`,
    };
  }
}

function findPathCode(place: string): string | null {
  const area = new JmaClient().getArea();

  for (const code in area.class20s) {
    if (area.class20s[code].name.startsWith(place)) {
      return area.class10s[area.class15s[area.class20s[code].parent].parent]
        .parent;
    }
  }

  for (const code in area.class15s) {
    if (area.class15s[code].name.startsWith(place)) {
      return area.class10s[area.class15s[code].parent].parent;
    }
  }

  for (const code in area.class10s) {
    if (area.class10s[code].name.startsWith(place)) {
      return area.class10s[code].parent;
    }
  }

  return null;
}

export { doPost, executeSlashCommand, createForecastResponse };
