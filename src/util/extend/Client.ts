import Collection from "@discordjs/collection";
import {ConfigObject, AdvancedConfig, create, Client as WaClient, Message} from "@open-wa/wa-automate";
import {prefix} from "../settings.js";
import {LoadCommands, commandInterface} from "../handle.js";
import {connect} from "../db/Mongo.js";

export interface MoreOptions {
  mongoUrl?:string
}

export class Client {
  options: ConfigObject | AdvancedConfig | undefined;
  clientInstances?: WaClient;
  commands?: Collection<string, commandInterface>;
  MongoUrl?: string;
  constructor(options?:ConfigObject|AdvancedConfig, AdvanceOptions?:MoreOptions) {
    this.MongoUrl = AdvanceOptions?.mongoUrl;
    this.options = options;
  }

  async start() {
    const Client = await create(this.options);
    await this.assignProperty();
    if (this.MongoUrl) {
      await connect(this.MongoUrl);
    }
    this.clientInstances = Client;
    return this.clientInstances;
  }

  private async assignProperty() {
    this.commands = await LoadCommands();
    return;
  }

  get client() {
    if (!this.clientInstances) throw Error("No client initializedf");
    return this.clientInstances;
  }

  parseMessage(msg:Message) {
    let text = msg.body;
    if (msg.type !== "chat") {
      text = "";
      if (msg.isMedia) {
        text = msg.caption;
        if (!msg.caption) {
          text = "";
        }
      }
    }

    const isPrefixed= text.startsWith(prefix) ? true : false;

    const args = isPrefixed ? text.slice(prefix.length).split(" ") : text.split(" ");
    const first = args.shift()?.toLowerCase();
    let isCommand = false;
    let commands;
    if (isPrefixed) {
      commands = this.commands!.find((o)=>o.name === first) || this.commands!.find((c) => c.alias.includes(first!.toLowerCase()));
      if (commands) {
        isCommand = true;
      }
    }
    return {text, isCommand, args, first, commands};
  }

  handleCommand(msg:Message) {
    const parsedMessage = this.parseMessage(msg);
    if (parsedMessage.isCommand) {
      this.logger(`Runned ${parsedMessage.commands!.name}`, "command");
      parsedMessage.commands!.run(this, msg);
    }
  }

  logger(text:string, type:string) {
    console.log(`[${type.toUpperCase()}] ${text}`);
  }
}
