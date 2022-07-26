import events from 'events';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';

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
    console.log(result);
    this.event.emit('message', result.message);
  }
}
