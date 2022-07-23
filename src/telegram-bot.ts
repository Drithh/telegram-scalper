import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import 'dotenv/config';
import { writeEnvToFile } from './util/env';
import { NewMessage, NewMessageEvent } from 'telegram/events/NewMessage';
import channel from './channels.json';

interface TradeOptions {
  isBuy: boolean;
  min: number;
  max: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
}

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
    const activeChannel = channel.find((c) => c.name === sender);
    if (activeChannel) {
      const matches = RegExp(activeChannel.regex).exec(message);
      if (matches && matches.length === 7) {
        const options: TradeOptions = {
          isBuy: message.toLowerCase().includes('buy'),
          min: parseFloat(matches[1]),
          max: parseFloat(matches[2]),
          tp1: parseFloat(matches[3]),
          tp2: parseFloat(matches[4]),
          tp3: parseFloat(matches[5]),
          sl: parseFloat(matches[6]),
        };
        console.log(options);
      }
    }
  }
}
