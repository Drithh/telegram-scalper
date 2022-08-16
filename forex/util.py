import MetaTrader5 as mt5
import time
import sys
import json

from dotenv import dotenv_values

def output(status: str, message):
    result = {
        "status": status,
        "message": message
    }
    print(json.dumps(result))
    sys.stdout.flush()

def output_exit(status: str, message):
    output(status, message)
    mt5.shutdown()
    quit()
    
def expiration_time():
    import datetime as dt
    expire = dt.datetime.now() + dt.timedelta(hours=5)
    timestamp = int(expire.timestamp())
    return timestamp


config = dotenv_values(".env")
sl_point = 300
tp_point = 120

def resolve_call(call, *args):
    if call=="info":
        output('info', show_info())
    elif call=="order":
        return send_orders(args[0], args[1], args[2], args[3], args[4], args[5])
    elif call=="show_active_positions":
        return show_active_positions()
    elif call=="close_position":
        return close_position(args[0], args[1])
    elif call=="edit_position":
        return edit_position(args[0], args[1], args[2])
    else:
        mt5.shutdown()
        quit()

def show_info():
    account = mt5.account_info()._asdict()
    output_exit("success", f"Info for account {account['name']}\n\nBalance: {account['balance']}\nCredit: {account['credit']}\nProfit: {account['profit']}\n\nEquity: {account['equity']}\nMargin: {account['margin']}\nMargin Free: {account['margin_free']}\n\nServer: {account['server']}")


    

def get_active_positions(symbol = 0):
    positions=mt5.positions_get() if symbol == 0 else  mt5.positions_get(symbol=symbol)
    if not len(positions):
        return["fail", f"No positions found, error code={format(mt5.last_error())}"]
    elif len(positions)>0:
        list_positions=[]
        for position in positions:
            list_positions.append(position._asdict())
        return["active", list_positions]
    mt5.shutdown()
    
def show_active_positions():
    result = get_active_positions()
    message_result = []
    if (result[0] == "active"):
        for position in result[1]:
            index = next((i for i, item in enumerate(message_result) if item["symbol"] == position['symbol']), None)
            if (index == None):
                message_result.append({
                    'symbol': position['symbol'],
                    'volume': position['volume'],
                    'profit': position['profit'],
                    'price_current': position['price_current'],
                    'price_open': [position['price_open']],
                    'sl': [position['sl']],
                    'tp': [position['tp']],
                })
            else:
                message_result[index]['profit'] += position['profit']
                message_result[index]['price_open'].append(position['price_open'])
                message_result[index]['sl'].append(position['sl'])
                message_result[index]['tp'].append(position['tp'])
        final_message = ""
        for message in message_result:
            if (len(final_message) > 0):
                final_message += '\n\n\n'
            active_position = len(message['price_open'])
            final_message += f'There are {active_position} active positions in {message["symbol"]}\nWith {message["volume"]} lots at {message["price_current"]}\nProfit: {message["profit"]}\n\n And the following prices:\n Open: {message["price_open"]}\n SL: {message["sl"]}\n TP: {message["tp"]}'
            
        output_exit("success", final_message)
    else:
        output_exit(result[0], result[1])
            
 
def send_orders(type, symbol, max_price, tp, sl, comment):
    isBuy = True if type == 'buy' else False
    success = 0
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        output_exit( "fail", symbol+" not found, can not call order_check()" )

    # if the symbol is unavailable in MarketWatch, add it
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol,True):
            output_exit( "fail", f"symbol_select {symbol} failed, exit")
    
    if (max_price == -1):
        max_price = symbol_info.ask if isBuy else symbol_info.bid

    if (tp == -1):
        sl = max_price + sl_point * symbol_info.point * (-1 if isBuy else 1)
        tp = max_price + tp_point * symbol_info.point * (1 if isBuy else -1)
     
    if ((isBuy and symbol_info.ask <= max_price)):
        output("success", f'{symbol} current price is {symbol_info.ask} and bid price is {max_price}\nPlacing order now')
        success += order_now(type, symbol, symbol_info.ask, tp, sl, comment)
        max_price = symbol_info.ask
    elif ((not isBuy and symbol_info.bid >= max_price)):
        output("success", f'{symbol} current price is {symbol_info.bid} and ask price is {max_price}\nPlacing order now')
        success += order_now(type, symbol, symbol_info.bid, tp, sl, comment)
        max_price = symbol_info.bid
    else:
        success += order_limit(type, symbol, max_price, tp, sl, comment)
    
    for i in range(int(config["TRADE_AMOUNT"]) - 1):
        success += order_limit(type, symbol, max_price, tp, sl, comment)
        max_price += symbol_info.point * 50 * (-1 if isBuy else 1)
        if ((type == 'sell' and max_price >= sl) or (isBuy and max_price <= sl)):
            break

    output_exit("success", f"Successfully placed {success} orders in {symbol} for {max_price}")


def order_now(type, symbol, max_price, tp, sl, comment):
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(config['TRADE_VOLUME']),
        "type": mt5.ORDER_TYPE_BUY if type == 'buy' else mt5.ORDER_TYPE_SELL,
        "price": max_price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 234000,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_DAY,
        "type_filling": mt5.ORDER_FILLING_FOK,
    }
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        output_exit("fail", f"Order failed, message={result.comment}")
    else:
        return 1

def order_limit(type, symbol, max_price, tp, sl, comment):
    # print(type, symbol, max_price, tp, sl)
    request = {
        "action": mt5.TRADE_ACTION_PENDING,
        "symbol": symbol,
        "volume": float(config['TRADE_VOLUME']),
        "type": mt5.ORDER_TYPE_BUY_LIMIT if type == 'buy' else mt5.ORDER_TYPE_SELL_LIMIT,
        "price": max_price,
        "sl": sl,
        "tp": tp,
        "deviation": 20,
        "magic": 234000,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_SPECIFIED,
        "type_filling": mt5.ORDER_FILLING_IOC,
        "expiration": expiration_time()
    }
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        output_exit("fail", f"Order failed, message={result.comment}")
    else:
        return 1

def close_position(symbol, close_amount):
    active_positions=get_active_positions()
    if active_positions[0]=="fail":
        output_exit("fail", 'There is no active position')
    else:
        # sort the positions by tp
        symbol_active_positions =  [d for d in active_positions[1] if d['symbol'] in symbol]
        sorted_active_positions = sorted(symbol_active_positions, key=lambda x: x['tp'])
        if (close_amount == 'half'):
            close_amount = len(sorted_active_positions) / 2
        elif (close_amount == 'all'):
            close_amount = len(sorted_active_positions)
        close_amount = int(close_amount)
        profit = 0
        for i in range(close_amount):
            position = sorted_active_positions[i]
            lot = float(config['TRADE_VOLUME'])
            price=mt5.symbol_info_tick(symbol).bid
            deviation=20
            request={
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_BUY if position['type'] == 1 else mt5.ORDER_TYPE_SELL,
                "position": position['ticket'],
                "price": price,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script close",
            }
            result=mt5.order_send(request)

            if result.retcode != mt5.TRADE_RETCODE_DONE:
                output_exit("fail", f"Close Order failed, message={result.comment}")
            else:
                profit += position['profit']
        output_exit("success", f"Close {close_amount} Order success, {symbol} {lot} lots at {price} \nProfit: {profit}")

def edit_position(symbol, key, value):
    active_positions=get_active_positions(symbol)
    if active_positions[0]=="fail":
        output_exit("fail", 'There is no active position')
    else:
        isBuy = 1 if active_positions[1][0]['type'] == 0 else -1
        isReduce = int(value) <= 0
        value = int(value) * isBuy
        for i in range(len(active_positions[1])):
            position = active_positions[1][i]
            price=mt5.symbol_info(symbol)
            lot = float(config['TRADE_VOLUME'])
            point = price.point
            sl = position['sl']
            tp = position['tp']
            if (key == "be"):
                sl = position['price_open'] + value * point
                tp += value * point
            else: 
                if (key == "sl"):
                    sl +=  value * point
                if (key == "tp"):
                    tp += value * point
            request={
                "action": mt5.TRADE_ACTION_SLTP,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_BUY if position['type'] == 0 else mt5.ORDER_TYPE_SELL,
                "position": position['ticket'],
                "sl": sl,
                "tp": tp,
                "magic": 234000,
                "comment": "python script close",
            }
            result=mt5.order_send(request)
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                output_exit("fail", f"Edit Order failed, message={result.comment}")
            # else:
                # output("success", f"Edit Order success, {symbol} {lot} lots at {position['price_open']} \n{key}: {value}")
        output("success", f"Edit {len(active_positions[1])} Order success, {'subtract' if isReduce else 'add'} {abs(value)} pip to {key}")
