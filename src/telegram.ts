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
    this.start();
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
    this.client.addEventHandler(this.eventPrint.bind(this), new NewMessage({}));
  }

  async eventPrint(event: NewMessageEvent) {
    const message = event.message.message;
    const sender = await event.message.getSender();
    if (sender.className === 'User') {
      if (sender.id.toString() === process.env.OWNER_ID) {
        this.resolveMessage(message);
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
      case '/info':
        this.event.emit('message', ['info']);
        break;
      case message.match('/buy') ? message : undefined:
        {
          const arg = message.match('/buy (.*)');
          if (!arg || arg[1].split(' ').length !== 4) {
            this.sendMessage(
              'Invalid arguments\n/buy <amount> <max_price> <tp> <sl>',
            );
          } else {
            const args = arg[1].split(' ');
            if (
              args.every((a) => !isNaN(parseFloat(a))) &&
              args.every((a) => !isNaN(parseInt(a)))
            ) {
              const buyMessage = ['buy'].concat(arg[1].split(' '));
              this.event.emit('message', buyMessage);
            } else {
              this.sendMessage('Invalid arguments\narguments must be numbers');
            }
          }
        }
        break;
      case message.match('/sell') ? message : undefined:
        {
          const arg = message.match('/sell (.*)');
          if (!arg || arg[1].split(' ').length !== 4) {
            this.sendMessage(
              'Invalid arguments\n/sell <amount> <min_price> <tp> <sl>',
            );
          } else {
            const args = arg[1].split(' ');
            if (
              args.every((a) => !isNaN(parseFloat(a))) &&
              args.every((a) => !isNaN(parseInt(a)))
            ) {
              const sellMessage = ['sell'].concat(arg[1].split(' '));
              this.event.emit('message', sellMessage);
            } else {
              this.sendMessage('Invalid arguments\narguments must be numbers');
            }
          }
        }
        break;
      case message.match('/close') ? message : undefined:
        {
          const arg = message.match('/close (.*)');
          if (!arg || arg[1].split(' ').length !== 1) {
            this.sendMessage('Invalid arguments\n/close <amount>');
          } else {
            const args = arg[1].split(' ');
            if (
              !isNaN(parseInt(args[1])) ||
              args[1] === 'all' ||
              args[1] === 'half'
            ) {
              const closeMessage = ['close'].concat(arg[1].split(' '));
              this.event.emit('message', closeMessage);
            } else {
              this.sendMessage('Invalid arguments\narguments must be numbers');
            }
          }
        }
        break;
      case message.match('/edit') ? message : undefined:
        {
          const arg = message.match('/edit (.*)');
          if (!arg || arg[1].split(' ').length !== 4) {
            this.sendMessage(
              'Invalid arguments\n/edit <amount> <max_price> <tp> <sl>',
            );
          } else {
            const args = arg[1].split(' ');
            if (
              args.every((a) => !isNaN(parseFloat(a))) &&
              args.every((a) => !isNaN(parseInt(a)))
            ) {
              const editMessage = ['edit'].concat(arg[1].split(' '));
              this.event.emit('message', editMessage);
            } else {
              this.sendMessage('Invalid arguments\narguments must be numbers');
            }
          }
        }
        break;
      case message.match('/config') ? message : undefined:
        {
          const arg = message.match('/config (.*)');
          if (!arg) {
            this.sendMessage(
              `Current config:\nTrade Amount: ${process.env.TRADE_AMOUNT}\nTrade Volume: ${process.env.TRADE_VOLUME}`,
            );
          } else if (arg[1].split(' ').length !== 2) {
            this.sendMessage('Invalid arguments\n/config <key> <value>');
          } else {
            const args = arg[1].split(' ');
            if (
              args[0].toLowerCase() === 'trade_amount' ||
              args[0].toLowerCase() === 'trade_volume'
            ) {
              if (!isNaN(parseFloat(args[1])) && !isNaN(parseInt(args[1]))) {
                writeEnvToFile([
                  { key: args[0].toUpperCase(), value: args[1] },
                ]);
                this.sendMessage(`${args[0]} set to ${args[1]}`);
              } else {
                this.sendMessage('Invalid value\nvalue must be a number');
              }
            } else {
              this.sendMessage('Invalid key');
            }
          }
        }
        break;

      case '/help':
        this.sendMessage(
          `Command List:\n/info\n - Show info about your account\n\n/buy <amount> <max_price> <tp> <sl>\n - Buy amount of currency at maxprice with tp and sl\n/sell <amount> <max_price> <tp> <sl>\n - Sell amount of currency at maxprice with tp and sl\n\n/close <amount>\n - Close all open trades\n/close all\n - Close all open trades\n/close half\n - Close half of open trades\n\n/active\n - Show active trades\n\n/edit <id> <amount> <max_price> <tp> <sl>\n - Edit trade with id\n\n/config <key> <value>\n - Set config value\n\tAvailable keys:\n\t- trade_amount\n\t- trade_volume\n/config\n - Show config values\n\n/help\n - Show this help message`,
        );
        break;
      default:
        this.sendMessage('command not found\nsend /help for help');
        break;
    }
  };
}
