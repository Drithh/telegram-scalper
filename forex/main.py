import MetaTrader5 as mt5
import sys
import json 
from util import resolve_call
from dotenv import dotenv_values

config = dotenv_values(".env")

def output(status: str, message):
    result = {
        "status": status,
        "message": message
    }
    print(json.dumps(result))
    sys.stdout.flush()
    mt5.shutdown()
    quit()
    

if not mt5.initialize():
    print("initialize() failed, error code =",mt5.last_error())
    quit()
 
if config['ACCOUNT'] == '' or config['PASSWORD'] == '' or config['SERVER'] == '':
    print("ACCOUNT, PASSWORD, SERVER are not set, please set them in .env file")
    quit()
else: 
    account=config['ACCOUNT'].encode('utf-8')
    password=config['PASSWORD'].encode('utf-8')
    server=config['SERVER']
    if not mt5.login(account, password, server):
        match sys.argv[1]:
            case 'info':
                result =  resolve_call('info')
            case 'buy' | 'sell':
                result =  resolve_call('order_send', sys.argv[1], sys.argv[2])
            case 'active':
                result = resolve_call('show_active_positions')
        output(result[0], result[1]);
        # order_send();
    else:
        print("failed to connect at account #{}, error code: {}".format(account, mt5.last_error()))





mt5.shutdown()

