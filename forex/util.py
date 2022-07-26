import MetaTrader5 as mt5
import pandas as pd
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


config = dotenv_values(".env")
symbol = 'XAUUSD'
def resolve_call(call, *args):
    if call=="info":
        output('info', show_info())
    elif call=="order_limit":
        return order_limit(args[0], args[1])
    elif call=="order_now":
        return order_now(args[0])
    elif call=="show_active_positions":
        return show_active_positions()
    elif call=="close_position":
        return close_position(args[0])
    elif call=="edit_position":
        return edit_position(args[0], args[1])
    else:
        mt5.shutdown()
        quit()

def show_info():
    return mt5.account_info()._asdict()


    

def get_active_positions():
    positions=mt5.positions_get(symbol=symbol)
    if positions==None:
        return["fail", f"No positions on {symbol}, error code={format(mt5.last_error())}"]
    elif len(positions)>0:
        list_positions=[]
        for position in positions:
            list_positions.append(position._asdict())
        return["active", list_positions]
    # shut down connection to the MetaTrader 5 terminal
    mt5.shutdown()
    
def show_active_positions():
    result = get_active_positions()
    output_exit(result[0], result[1])
 
def close_position(close_amount):
    active_positions=get_active_positions()
    if active_positions[0]=="fail":
        output_exit("fail", 'There is no active position')
    else:
        # sort the positions by tp
        sorted_active_positions = sorted(active_positions[1], key=lambda x: x['tp'])
        if (close_amount == 'half'):
            close_amount = len(sorted_active_positions) / 2
        elif (close_amount == 'all'):
            close_amount = len(sorted_active_positions)
        close_amount = int(close_amount)
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
                "type_time": mt5.ORDER_TIME_DAY,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
            result=mt5.order_send(request)

            if result.retcode != mt5.TRADE_RETCODE_DONE:
                output_exit("fail", f"Close Order failed, retcode={result.retcode}")
            else:
                output("success", f"Close Order success, {symbol} {lot} lots at {price} \nProfit: {position['profit']}")

def order_now(type):
    # prepare the buy request structure
    success = 0
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        output_exit( "fail", symbol+"not found, can not call order_check()" )
    
    # if the symbol is unavailable in MarketWatch, add it
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol,True):
            output_exit( "fail", f"symbol_select {symbol} failed, exit")
    for i in range(int(config["TRADE_AMOUNT"])):
        lot = float(config['TRADE_VOLUME'])
        point = mt5.symbol_info(symbol).point
        price = mt5.symbol_info_tick(symbol).ask
        deviation = 20
        
        if (type == "buy"):
            request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_BUY,
                "price": price,
                "sl": price - 500 * point,
                "tp": price + 300 * point,
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
                "price": price,
                "sl": price + 500 * point,
                "tp": price - 300 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_DAY,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
        
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            output_exit("fail", f"Order failed, retcode={result.retcode}")
        else:
            success += 1
    output("success", f"Successfully placed {success} orders in {symbol} for {price}")
    
def order_limit(type, max_price):
    success = 0
    # prepare the buy request structure
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        output_exit( "fail", symbol+"not found, can not call order_check()" )
    
    # if the symbol is unavailable in MarketWatch, add it
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol,True):
            output_exit( "fail", f"symbol_select {symbol} failed, exit")
    for i in range(int(config["TRADE_AMOUNT"])):
        lot = float(config['TRADE_VOLUME'])
        point = mt5.symbol_info(symbol).point
        price = float(max_price)
        deviation = 20
        
        if (type == "buy"):
            request = {
                "action": mt5.TRADE_ACTION_PENDING,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_BUY_LIMIT,
                "price": price,
                "sl": price - 500 * point,
                "tp": price + 300 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_DAY,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
        else:
            request = {
                "action": mt5.TRADE_ACTION_PENDING,
                "symbol": symbol,
                "volume": lot,
                "type": mt5.ORDER_TYPE_SELL_LIMIT,
                "price": float(max_price),
                "sl": price + 500 * point,
                "tp": price - 300 * point,
                "deviation": deviation,
                "magic": 234000,
                "comment": "python script open",
                "type_time": mt5.ORDER_TIME_DAY,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
        
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            output_exit("fail", f"Order failed, retcode={result.retcode}")
        else:
            success += 1
    output("success", f"Successfully placed {success} orders in {symbol} for {max_price}")
    


def edit_position(key, value):
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
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_FOK,
            }
            result=mt5.order_send(request)
            if result.retcode != mt5.TRADE_RETCODE_DONE:
                output_exit("fail", f"Edit Order failed, retcode={result.retcode}")
            # else:
                # output("success", f"Edit Order success, {symbol} {lot} lots at {position['price_open']} \n{key}: {value}")
        output("success", f"Edit {len(active_positions[1])} Order success, {'subtract' if isReduce else 'add'} {abs(value)} pip to {key}")
