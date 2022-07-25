import { Telegram } from './telegram';
import { Trade } from './trade';
import 'dotenv/config';

(async () => {
  const trade = new Trade();
  const telegram = new Telegram();

  trade.event.on('message', (message) => {
    telegram.sendMessage(message);
  });
  telegram.event.on('message', (event: string[]) => {
    trade.call(event);
  });
})();
