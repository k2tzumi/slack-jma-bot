import { SlackBaseHandler } from "./SlackBaseHandler";
import { Slack } from "./slack/types/index.d";

type DoPost = GoogleAppsScript.Events.DoPost;
type TextOutput = GoogleAppsScript.Content.TextOutput;
type Commands = Slack.SlashCommand.Commands;

interface SlashCommandFunctionResponse {
  response_type: string;
  text?: string;
  blocks?: Record<string, any>;
}
type SlashCommandFunction = (
  commands: Commands
) => SlashCommandFunctionResponse;

class SlashCommandHandler extends SlackBaseHandler<SlashCommandFunction> {
  public handle(e: DoPost): { performed: boolean; output: TextOutput | null } {
    const { token, command } = e.parameter as {
      token: string;
      command: string | null;
    };

    if (command) {
      this.validateVerificationToken(token);
      return {
        performed: true,
        output: this.convertJSONOutput(
          this.bindCommand(e.parameter as Commands)
        ),
      };
    }

    return { performed: false, output: null };
  }

  private bindCommand(commands: Commands): SlashCommandFunctionResponse | null {
    const { trigger_id, command } = commands;
    if (this.isHandleProceeded(trigger_id)) {
      throw new Error(
        `Slash command duplicate called. trigger_id: ${trigger_id}, command: ${command}`
      );
    }

    const listner = this.getListener(command);

    if (listner) {
      return listner(commands);
    }

    throw new Error(
      `Unknow Slash command. command: ${JSON.stringify(command)}`
    );
  }
}

export {
  SlashCommandHandler,
  SlashCommandFunction,
  SlashCommandFunctionResponse,
};
