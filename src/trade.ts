import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { Telegram } from './telegram';

interface Result {
  status: string;
  message: string | JSON;
}
export class Trade {
  constructor(telegram: Telegram) {
    this.telegram = telegram;
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
  }
}
