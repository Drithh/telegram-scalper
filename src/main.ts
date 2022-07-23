// import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { Bot } from './telegram-bot';
// class RFModel {
//   constructor() {
//     this.python = spawn('python', ['forex/main.py']);

//     this.python.stdout.on('data', (data) => {
//       this.receive(data);
//     });

//     this.python.on('close', async function () {
//       console.log(`exited gracefully`);
//     });
//   }

//   private python: ChildProcessWithoutNullStreams;

//   send(data: string) {
//     this.python.stdin.write(data);
//   }

//   receive(data: { toString: () => string }) {
//     const datas = JSON.parse(data.toString());
//     console.log(datas);
//   }
// }

(async () => {
  // new RFModel();
  const bot = new Bot();
  await bot.start();
})();
