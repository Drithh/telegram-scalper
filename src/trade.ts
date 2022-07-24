import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { messageParser } from './util/message-parser';
import events from 'events';

interface Result {
  status: string;
  message: string | JSON;
}
export class Trade {
  private python: ChildProcessWithoutNullStreams;
  public event = new events.EventEmitter();

  call(args: string[]) {
    this.python = spawn('python', ['forex/main.py', ...args]);

    this.python.stdout.on('data', (data) => {
      this.receive(data);
    });
  }

  receive(data: { toString: () => string }) {
    const result: Result = JSON.parse(data.toString());
    if (typeof result.message === 'string') {
      this.event.emit('message', result.message);
    } else {
      this.event.emit('message', messageParser(result));
    }
  }
}
