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
    if (event[0] === 'buy' || event[0] === 'sell') {
      for (let i = 0; i < parseInt(process.env.TRADE_AMOUNT); i++) {
        trade.call(event);
      }
    } else {
      trade.call(event);
    }
  });
})();
