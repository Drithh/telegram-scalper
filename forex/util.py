import MetaTrader5 as mt5
import pandas as pd
import time

from dotenv import dotenv_values

config = dotenv_values(".env")

def resolve_call(call, *args):
    if call=="info":
        return ['info', show_info()]
    elif call=="order_send":
        return order_send(args[0], args[1])
    elif call=="show_active_positions":
        return show_active_positions()
    else:
        print("Unknown call:",call)
        print("Valid calls: order_send, show_active_order")
        print("Shutdown and quit")
        mt5.shutdown()
        quit()

def show_info():
    return mt5.account_info()._asdict()

def show_active_positions():
    positions=mt5.positions_get(symbol="XAUUSD")
    if positions==None:
        return["active", f"No positions on XAUUSD, error code={format(mt5.last_error())}"]
    elif len(positions)>0:
        list_positions=[]
        for position in positions:
            list_positions.append(position._asdict())
        return["active", list_positions]
    # shut down connection to the MetaTrader 5 terminal
    mt5.shutdown()
 
    

def order_send(type, max_price):
    # prepare the buy request structure
    symbol = "XAUUSD"
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        return [ "fail", symbol+"not found, can not call order_check()" ]
    
    # if the symbol is unavailable in MarketWatch, add it
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol,True):
            return [ "fail", f"symbol_select {symbol} failed, exit"]
    
    lot = float(config['TRADE_VOLUME'])
    point = mt5.symbol_info(symbol).point
    price = mt5.symbol_info_tick(symbol).ask
    deviation = 20
    if (type == "buy"):
        if (price <= float(max_price)):
            return [ "fail", f"Price {price} is too high\nThe max price is {max_price}"]
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
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_FOK,
        }
    else:
        if (price >= float(max_price)):
            return ["fail", f"Price {price} is too low\nYour max price is {max_price}"]
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
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_FOK,
        }
    
    # send a trading request
    result = mt5.order_send(request)
    # check the execution result
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return["fail", f"Order failed, retcode={result.retcode}"]
        # # request the result as a dictionary and display it element by element
        # result_dict=result._asdict()
        # for field in result_dict.keys():
        #     # print("   {}={}".format(field,result_dict[field]))
        #     # if this is a trading request structure, display it element by element as well
        #     if field=="request":
        #         traderequest_dict=result_dict[field]._asdict()
        #         for tradereq_filed in traderequest_dict:
        #             # return["success", f"traderequest: {tradereq_filed}={traderequest_dict[tradereq_filed]}"]
        # mt5.shutdown()
        # quit()
    else:
        return["success", f"Order success, {type.capitalize()} {symbol} {lot} lots at {price} with deviation={deviation} points"];

