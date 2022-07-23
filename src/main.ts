import { Telegram } from './telegram';
import { Trade } from './trade';

(async () => {
  const telegram = new Telegram();
  await telegram.start();
  const trade = new Trade(telegram);
  trade.call(['info']);
})();
