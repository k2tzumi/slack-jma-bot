import { SlackBaseHandler } from "./SlackBaseHandler";
import { Slack } from "./slack/types/index.d";

type DoPost = GoogleAppsScript.Events.DoPost;
type TextOutput = GoogleAppsScript.Content.TextOutput;
type Interaction = Slack.Interactivity.Interaction;
type BlockActions = Slack.Interactivity.BlockActions;
type InteractivityFunction = (
  interaction: Interaction
) => Record<string, any> | void;

class InteractivityHandler extends SlackBaseHandler<InteractivityFunction> {
  public handle(e: DoPost): { performed: boolean; output: TextOutput | null } {
    const { payload } = e.parameter as { payload?: string };

    if (payload) {
      const request = JSON.parse(payload);
      return {
        performed: true,
        output: this.convertJSONOutput(this.bindInteractivity(request)),
      };
    }

    return { performed: false, output: null };
  }

  private bindInteractivity(
    interaction: Interaction
  ): Record<string, any> | void {
    const { type, token, trigger_id, hash } = interaction;
    this.validateVerificationToken(token);

    switch (true) {
      case typeof trigger_id === "string":
        if (this.isHandleProceeded(trigger_id as string)) {
          throw new Error(
            `Interaction payloads duplicate called. request: ${JSON.stringify(
              interaction
            )}`
          );
        }
        break;
      case typeof hash === "string":
        if (this.isHandleProceeded(hash as string)) {
          throw new Error(
            `Interaction payloads duplicate called. request: ${JSON.stringify(
              interaction
            )}`
          );
        }
        break;
      default:
        throw new Error(
          `Unknow interaction payloads. request: ${JSON.stringify(interaction)}`
        );
    }

    // Prefer subtype listeners for block actions
    if (type === "block_actions") {
      const blockActions = interaction as BlockActions;

      const blockActionListener = this.getListener(
        blockActions.actions[0].type
      );

      if (blockActionListener) {
        blockActionListener(blockActions);
        return;
      }
    }

    const interactivityListner = this.getListener(type);

    if (interactivityListner) {
      return interactivityListner(interaction);
    }

    throw new Error(
      `Undifine interaction listner. payload: ${JSON.stringify(interaction)}`
    );
  }
}

export { InteractivityHandler, InteractivityFunction };
