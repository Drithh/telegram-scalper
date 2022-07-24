import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { Telegram } from './telegram';
import { messageParser } from './util/message-parser';
interface Result {
  status: string;
  message: string | JSON;
}
export class Trade {
  constructor(telegram: Telegram) {
    this.telegram = telegram;
    telegram.event.on('message', (message) => {
      this.receive(message);
    });
  }

  private python: ChildProcessWithoutNullStreams;
  private telegram: Telegram;

  call(args: string[]) {
    this.python = spawn('python', ['forex/main.py', ...args]);

    this.python.stdout.on('data', (data) => {
      this.receive(data);
    });
  }

  receive(data: { toString: () => string }) {
    const result: Result = JSON.parse(data.toString());
    if (typeof result.message === 'string') {
      this.telegram.sendMessage(result.message);
    } else {
      this.telegram.sendMessage(messageParser(result));
    }
  }
}
