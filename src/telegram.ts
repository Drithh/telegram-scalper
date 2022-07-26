import 'dotenv/config';
import events from 'events';
import input from 'input';
import { Api, TelegramClient } from 'telegram';
import { NewMessage, NewMessageEvent } from 'telegram/events/NewMessage';
import { StringSession } from 'telegram/sessions';
import channels from './channels.json';
import { writeEnvToFile } from './util/env';
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
    await this.client.invoke(
      new Api.messages.SendMessage({
        peer: process.env.OWNER_USERNAME,
        message: message,
        noWebpage: true,
        scheduleDate: 43,
      }),
    );
  }

  resolveMessage = (message: string) => {
    switch (message) {
      case '/info':
        this.event.emit('message', ['info']);
        break;
      case message.match('/buy') ? message : undefined:
        {
          const arg = message.match('/buy (.*)');
          if (!arg || arg[1].split(' ').length !== 2) {
            this.sendMessage('Invalid arguments\n/buy <symbol> <max_price>');
          } else {
            const args = arg[1].split(' ');
            if (
              (!isNaN(parseFloat(args[1])) && !isNaN(parseInt(args[1]))) ||
              args[1] === 'now'
            ) {
              if (args[1] === 'now') {
                this.event.emit('message', ['buy', args[0]]);
              } else {
                this.event.emit('message', ['buy', args[0], args[1]]);
              }
            } else {
              this.sendMessage(
                'Invalid arguments\narguments must be string symbol and numbers',
              );
            }
          }
        }
        break;
      case message.match('/sell') ? message : undefined:
        {
          const arg = message.match('/sell (.*)');
          if (!arg || arg[1].split(' ').length !== 2) {
            this.sendMessage('Invalid arguments\n/sell <symbol> <max_price>');
          }
          const args = arg[1].split(' ');
          if (
            (!isNaN(parseFloat(args[1])) && !isNaN(parseInt(args[1]))) ||
            args[1] === 'now'
          ) {
            if (args[1] === 'now') {
              this.event.emit('message', ['sell', args[0]]);
            } else {
              this.event.emit('message', ['sell', args[0], args[1]]);
            }
          } else {
            this.sendMessage(
              'Invalid arguments\narguments must be string symbol and numbers',
            );
          }
        }
        break;
      case message.match('/close') ? message : undefined:
        {
          const arg = message.match('/close (.*)');
          if (!arg || arg[1].split(' ').length !== 2) {
            this.sendMessage('Invalid arguments\n/close <symbol> <amount>');
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
              this.sendMessage(
                'Invalid arguments\narguments must be numbers or half or all',
              );
            }
          }
        }
        break;
      case '/active':
        this.event.emit('message', ['active']);
        break;
      case message.match('/edit') ? message : undefined:
        {
          const arg = message.match('/edit (.*)');
          if (!arg || arg[1].split(' ').length !== 2) {
            this.sendMessage('Invalid arguments\n/edit <options> <pip>');
          } else {
            const args = arg[1].split(' ');
            if (
              (!isNaN(parseInt(args[1])) && args[0] === 'tp') ||
              args[0] === 'sl' ||
              args[0] === 'be'
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
          'Available commands:\n/info\n/buy <symbol> <max_price | now>\n/sell <symbol> <max_price | now>\n/close <symbol> <amount | half | all>\n/active\n/edit <be | sl | tp> <pip>\n/config <key> <value>\n/help',
        );
        break;
      default:
        this.sendMessage('command not found\nsend /help for help');
        break;
    }
  };
}
