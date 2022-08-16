import 'dotenv/config';
import events from 'events';
import input from 'input';
import { Api, TelegramClient } from 'telegram';
import { NewMessage, NewMessageEvent } from 'telegram/events/NewMessage';
import { StringSession } from 'telegram/sessions';
import config from './config.json';
import { writeEnvToFile } from './util/env';
// interface TradeOptions {
//   isBuy: boolean;
//   min: number;
//   max: number;
//   tp1: number;
//   tp2: number;
//   tp3: number;
//   sl: number;
// }

export class Telegram {
  constructor() {
    this.client = new TelegramClient(
      new StringSession(
        process.env.STRING_SESSION ? process.env.STRING_SESSION : '',
      ),
      parseInt(process.env.API_ID ? process.env.API_ID : '0'),
      process.env.API_HASH ? process.env.API_HASH : '',
      {
        connectionRetries: 100,
      },
    );
    this.start();
    // this.messageSender();
  }

  private client: TelegramClient;
  // private messages: string[] = [];
  public event = new events.EventEmitter();

  async start(): Promise<void> {
    if (!process.env.STRING_SESSION) {
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
    }
    await this.client.connect();
    this.client.addEventHandler(this.eventPrint.bind(this), new NewMessage({}));
  }

  // public sendMessage(message: string) {
  //   this.messages.push(message);
  // }

  // private messageSender() {
  //   setInterval(() => {
  //     if (this.messages.length > 0) {
  //       this.sendMessage(this.messages.shift());
  //     }
  //   }, 2000);
  // }

  async eventPrint(event: NewMessageEvent) {
    const message = event.message.message;
    const sender = await event.message.getSender();
    if (sender.className === 'User') {
      if (sender.id.toString() === process.env.OWNER_ID) {
        this.resolveUserMessage(message);
      }
    } else if (sender.className === 'Channel') {
      const upperCaseMessage = message
        .toUpperCase()
        .replaceAll(/[/]/gi, '')
        .replaceAll(/[,]/gi, '.');
      const activeChannel = config.channels.find(
        (c) => c.name === sender.username,
      );
      if (activeChannel) {
        this.resolveChannelMessage(upperCaseMessage, sender.username);
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

  resolveUserMessage = (message: string) => {
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
          if (!arg || arg[1].split(' ').length !== 3) {
            this.sendMessage(
              'Invalid arguments\n/edit <symbol> <options> <pip>',
            );
          } else {
            const args = arg[1].split(' ');
            if (
              !isNaN(parseInt(args[2])) &&
              (args[1] === 'tp' || args[1] === 'sl' || args[1] === 'be')
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

  resolveChannelMessage = (message: string, sender: string) => {
    const order = {
      type: '',
      symbol: '',
      price: -1,
      tp: -1,
      sl: -1,
    };

    const getType = (message: string) => {
      if (message.match('BUY')) {
        return 'buy';
      } else if (message.match('SELL')) {
        return 'sell';
      } else {
        return '';
      }
    };

    const getPrice = (messages: string[]) => {
      const resolvePrice = (price: string) => {
        if (price.includes('-')) {
          return parseFloat(price.split('-')[0]);
        } else {
          return parseFloat(price);
        }
      };

      for (const message of messages) {
        if (message.match(/TAKE|TP/g)) {
          if (order.tp === -1) {
            const regex = /([0-9.]{4,})/g;
            const match = regex.exec(message);
            if (match) {
              order.tp = parseFloat(match[1]);
            }
          }
        } else if (message.match(/SL|STOP/g)) {
          const regex = /([0-9.]{4,})/g;
          const match = regex.exec(message);
          if (match) {
            order.sl = parseFloat(match[1]);
          }
        } else {
          const regexPrice = [/([0-9.]+ *- *[0-9.]{4,})/g, /([0-9.]{4,})/g];
          for (const regex of regexPrice) {
            const match = regex.exec(message);
            if (match) {
              order.price = resolvePrice(match[1]);
            }
          }
        }
      }
    };
    const getSymbol = (message: string) => {
      const symbol = config.symbols.find((s) => message.includes(s));
      if (symbol === 'GOLD') {
        return 'XAUUSD';
      } else if (symbol === 'NAS100') {
        return 'US100';
      } else {
        return symbol;
      }
    };
    order.symbol = getSymbol(message);
    order.type = getType(message);
    getPrice(message.split('\n'));

    if (order.type === '' && order.tp !== -1 && order.sl !== -1) {
      if (order.tp > order.sl) {
        order.type = 'buy';
      }
      if (order.tp < order.sl) {
        order.type = 'sell';
      }
    }

    const countMissingOrder = () => {
      let count = 0;
      count += order.type === '' ? 1 : 0;
      count += order.symbol === '' ? 1 : 0;
      count += order.price === -1 ? 1 : 0;
      count += order.tp === -1 ? 1 : 0;
      count += order.sl === -1 ? 1 : 0;
      return count;
    };
    const missingOrder = countMissingOrder();
    console.log(order);
    if (missingOrder <= 2) {
      this.sendMessage(
        `Found Signal from ${sender}\nPlacing ${
          process.env.TRADE_AMOUNT
        } orders to ${
          order.type
            ? order.type[0].toUpperCase() + order.type.substring(1)
            : 'unknown'
        } ${order.symbol} at ${order.price}`,
      );

      if (missingOrder === 0) {
        this.event.emit('message', [
          order.type,
          order.symbol,
          order.price,
          order.tp,
          order.sl,
        ]);
      } else {
        this.sendMessage(
          `Could not find all required information to place order\n${
            order.symbol === '' ? 'Symbol ' : ''
          }${order.price === -1 ? 'Price ' : ''}${
            order.tp === -1 ? 'TP ' : ''
          }${order.sl === -1 ? 'SL ' : ''}${
            order.type === '' ? 'Type ' : ''
          } is missing`,
        );
      }
    }
  };
}
