import { Bot } from './telegram-bot';

(async () => {
  const bot = new Bot();
  await bot.start();
})();
