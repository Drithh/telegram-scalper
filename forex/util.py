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
    expire = dt.datetime.now() + dt.timedelta(hours=3, minutes=30)
    timestamp = int(expire.timestamp())
    return timestamp


config = dotenv_values(".env")

def resolve_call(call, *args):
    if call=="info":
        output('info', show_info())
    elif call=="order_limit":
        return order_limit(args[0], args[1], args[2])
    elif call=="order_now":
        return order_now(args[0], args[1])
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


    

def get_active_positions():
    positions=mt5.positions_get()
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
            
 


def order_now(type, symbol):
    # prepare the buy request structure
    success = 0
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        output_exit( "fail", symbol+" not found, can not call order_check()" )
    
    # if the symbol is unavailable in MarketWatch, add it
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol,True):
            output_exit( "fail", f"symbol_select {symbol} failed, exit")
    for i in range(int(config["TRADE_AMOUNT"])):
        lot = float(config['TRADE_VOLUME'])
        price = mt5.symbol_info(symbol)
        point = price.point
        ask_price = price.ask
        bid_price = price.bid
        deviation = 20
        
        if (type == "buy"):
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_BUY,
                "price": ask_price,
                "sl": ask_price - 500 * point,
                "tp": ask_price + 120 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_DAY,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
        else:
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_SELL,
                "price": bid_price,
                "sl": bid_price + 500 * point,
                "tp": bid_price - 120 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_DAY,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
        
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            output_exit("fail", f"Order failed, message={result.comment}")
        else:
            success += 1
    output_exit("success", f"Successfully placed {success} orders in {symbol} for {ask_price if type == 'buy' else bid_price}")
    
def order_limit(type, symbol, max_price):
    success = 0
    # prepare the buy request structure
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        output_exit( "fail", symbol+" not found, can not call order_check()" )
    
    # if the symbol is unavailable in MarketWatch, add it
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol,True):
            output_exit( "fail", f"symbol_select {symbol} failed, exit")
    current_price = mt5.symbol_info_tick(symbol)
    bid_price = current_price.bid
    ask_price = current_price.ask
    point = mt5.symbol_info(symbol).point
    max_price = float(max_price) + ((point * 200) if type == 0 else (point * -200))

    if ((type == "buy" and ask_price <= max_price)):
        output("success", f'{symbol} current price is {ask_price} and bid price is {max_price}\nPlacing order now')
        order_now(type, symbol)
    elif ( (type == "sell" and bid_price >= max_price)):
        output("success", f'{symbol} current price is {bid_price} and ask price is {max_price}\nPlacing order now')
        order_now(type, symbol)
        
    if (type == "buy" and abs(ask_price - max_price) / point > 200):
        output("success", f'{symbol} current price is {ask_price} and ask price is {max_price}\nImposibble to order limit ({abs(bid_price - max_price) / point} pip)\nPlacing order now')
        order_now(type, symbol)
    elif (type == "sell" and abs(bid_price - max_price) / point > 200):
        output("success", f'{symbol} current price is {bid_price} and bid price is {max_price}\nImposibble to order limit ({abs(bid_price - max_price) / point} pip)\nPlacing order now')
        order_now(type, symbol)
        
    if (abs(ask_price - max_price) > 5):
        output_exit("success", f'Imposibble To Order\n{symbol} current price is {ask_price} and ask price is {max_price}')
    for i in range(int(config["TRADE_AMOUNT"])):
        lot = float(config['TRADE_VOLUME'])
        price = max_price
        deviation = 20
        
        if (type == "buy"):
            request = {
                "action": mt5.TRADE_ACTION_PENDING,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_BUY_LIMIT,
                "price": max_price,
                "sl": max_price - 500 * point,
                "tp": max_price + 120 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_SPECIFIED,
                "type_filling": mt5.ORDER_FILLING_FOK,
                "expiration": expiration_time()
            }
        else:
            request = {
                "action": mt5.TRADE_ACTION_PENDING,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_SELL_LIMIT,
                "price": float(max_price),
                "sl": max_price + 500 * point,
                "tp": max_price - 120 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_SPECIFIED,
                "type_filling": mt5.ORDER_FILLING_FOK,
                "expiration": expiration_time()
            }
        
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            output_exit("fail", f"Order failed, message={result.comment}")
        else:
            success += 1
    output_exit("success", f"Successfully placed {success} orders in {symbol} for {max_price}")
    
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
    active_positions=get_active_positions()
    if active_positions[0]=="fail":
        output_exit("fail", 'There is no active position')
    else:
        isBuy = 1 if active_positions[1][0]['type'] == 0 else -1
        isReduce = int(value) <= 0
        value = int(value) * isBuy
        for i in range(len(active_positions[1])):
            position = active_positions[1][i]
 
            lot = float(config['TRADE_VOLUME'])
            price=mt5.symbol_info_tick(symbol).bid
            deviation=20
            point = mt5.symbol_info(symbol).point
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
                "price": price,
                "sl": sl,
                "tp": tp,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script close",
            }
            result=mt5.order_send(request)
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                output_exit("fail", f"Edit Order failed, message={result.comment}")
            # else:
                # output("success", f"Edit Order success, {symbol} {lot} lots at {position['price_open']} \n{key}: {value}")
        output("success", f"Edit {len(active_positions[1])} Order success, {'subtract' if isReduce else 'add'} {abs(value)} pip to {key}")
