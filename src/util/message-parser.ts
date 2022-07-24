interface Result {
  status: string;
  message: AccountInfo | string | JSON;
}
export const messageParser = (message: Result): string => {
  switch (message.status) {
    case 'info':
      return accountInfo(message.message as AccountInfo);
  }
  return '';
};

interface AccountInfo {
  login: number;
  trade_mode: number;
  leverage: number;
  limit_orders: number;
  margin_so_mode: number;
  trade_allowed: boolean;
  trade_expert: boolean;
  margin_mode: number;
  currency_digits: number;
  fifo_close: boolean;
  balance: number;
  credit: number;
  profit: number;
  equity: number;
  margin: number;
  margin_free: number;
  margin_level: number;
  margin_so_call: number;
  margin_so_so: number;
  margin_initial: number;
  margin_maintenance: number;
  assets: number;
  liabilities: number;
  commission_blocked: number;
  name: string;
  server: string;
  currency: string;
  company: string;
}

const accountInfo = (account: AccountInfo): string => {
  return `Info for account ${account.name}\n\nBalance: ${account.balance}\nCredit: ${account.credit}\nProfit: ${account.profit}\n\nEquity: ${account.equity}\nMargin: ${account.margin}\nMargin Free: ${account.margin_free}\n\nServer: ${account.server}
  `;
};
