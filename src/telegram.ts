import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import 'dotenv/config';
import { writeEnvToFile } from './util/env';
import { NewMessage, NewMessageEvent } from 'telegram/events/NewMessage';
import channels from './channels.json';
import events from 'events';
interface TradeOptions {
  isBuy: boolean;
  min: number;
  max: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
}

export class Telegram {
  constructor() {
    this.client = new TelegramClient(
      new StringSession(
        process.env.STRING_SESSION ? process.env.STRING_SESSION : '',
      ),
      parseInt(process.env.API_ID ? process.env.API_ID : '0'),
      process.env.API_HASH ? process.env.API_HASH : '',
      {
        connectionRetries: 5,
      },
    );
  }

  private client: TelegramClient;
  public event = new events.EventEmitter();

  async start(): Promise<void> {
    await this.client.start({
      phoneNumber: async () => {
        return process.env.PHONE_NUMBER
          ? process.env.PHONE_NUMBER
          : await input.text('Please enter your number: ');
      },
      password: async () => await input.text('Please enter your password: '),
      phoneCode: async () =>
        await input.text('Please enter the code you received: '),
      onError: (err) => console.log(err),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stringSession: any = this.client.session.save();
    writeEnvToFile([{ key: 'STRING_SESSION', value: stringSession }]);
    await this.client.connect();
    this.client.addEventHandler(this.eventPrint, new NewMessage({}));
  }

  async eventPrint(event: NewMessageEvent) {
    const message = event.message.message;
    const sender = await event.message.getSender();
    if (sender.className === 'User') {
      if (sender.id.toString() === process.env.OWNER_ID) {
        console.log(sender);
      }
    } else if (sender.className === 'Channel') {
      const activeChannel = channels.find((c) => c.name === sender.username);
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

  async sendMessage(message: string) {
    const result = await this.client.invoke(
      new Api.messages.SendMessage({
        peer: process.env.OWNER_USERNAME,
        message: message,
        noWebpage: true,
        scheduleDate: 43,
      }),
    );
    console.log(result);
  }

  resolveMessage = (message: string) => {
    switch (message) {
      case 'info':
        this.event.emit('event', 'info');
        break;

      default:
        this.sendMessage('command not found\nsend /help for help');
        break;
    }
  };
}
