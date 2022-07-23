// import { Bot } from './telegram-bot';
import zmq from 'zeromq';
const sock = zmq.socket('push');

(async () => {
  // const bot = new Bot();
  // await bot.start();

  sock.bindSync('tcp://127.0.0.1:15555');
  console.log('Producer bound to port 3000');

  setInterval(function () {
    console.log('sending work');
    sock.send('some work');
  }, 1000);
})();
