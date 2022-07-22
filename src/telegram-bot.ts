import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import 'dotenv/config';
import { writeEnvToFile } from './util/env';
import { NewMessage, NewMessageEvent } from 'telegram/events/NewMessage';
import channel from './channels.json';

export class Bot {
  constructor() {
    this.client = new TelegramClient(
      new StringSession(process.env.STRING_SESSION),
      parseInt(process.env.API_ID),
      process.env.API_HASH,
      {
        connectionRetries: 5,
      },
    );
  }

  private client: TelegramClient;

  async start(): Promise<void> {
    this.client.start({
      phoneNumber: async () => await input.text('Please enter your number: '),
      password: async () => await input.text('Please enter your password: '),
      phoneCode: async () =>
        await input.text('Please enter the code you received: '),
      onError: (err) => console.log(err),
    });
    writeEnvToFile([
      { key: 'STRING_SESSION', value: this.client.session.save() },
    ]);
    await this.client.connect();
    this.client.addEventHandler(this.eventPrint, new NewMessage({}));
  }

  async eventPrint(event: NewMessageEvent) {
    const message = event.message.message;
    const sender = await event.message
      .getSender()
      .then((sender: Api.Channel) => sender.username);

    if (channel.map((c) => c.name).includes(sender)) {
      console.log(`${sender}: ${message}`);
    }
  }
}
