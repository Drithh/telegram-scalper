interface Result {
  status: string;
  message: AccountInfo | ActiveOrder[] | string | JSON;
}
export const messageParser = (message: Result): string => {
  switch (message.status) {
    case 'info':
      return accountInfo(message.message as AccountInfo);
    case 'active':
      return activeOrders(message.message as ActiveOrder[]);
  }
  return '';
};

interface ActiveOrder {
  ticket: number;
  time: number;
  time_msc: number;
  time_update: number;
  time_update_msc: number;
  type: number;
  magic: number;
  identifier: number;
  reason: number;
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  swap: number;
  profit: number;
  symbol: string;
  comment: string;
  external_id: string;
}

const activeOrders = (orders: ActiveOrder[]): string => {
  return orders
    .map((order) => {
      return `Ticket: ${order.ticket}\nPrice Open: ${order.price_open}\nSL: ${order.sl}\nTP: ${order.tp}\nPrice Current: ${order.price_current}\nProfit: ${order.profit}\n\n`;
    })
    .join('\n');
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
