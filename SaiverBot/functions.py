import pandas as pd
import requests, time, os
import dontshare as d  # Assuming this module contains your API key
from datetime import datetime, timedelta

import constants as c

import asyncio
import websockets
import json

import websocket
# import thread

import time 
from rich.progress import track
import enlighten

# Function to calculate the timestamps for now and 10 days from now
def get_time_range(interval):

    now = datetime.now()

    match interval:        
        case '1m':  ten_days_earlier = now - timedelta(minutes=1)
        case '3m':  ten_days_earlier = now - timedelta(minutes=3)
        case '5m':  ten_days_earlier = now - timedelta(minutes=5)
        case '15m': ten_days_earlier = now - timedelta(minutes=15)
        case '30m': ten_days_earlier = now - timedelta(minutes=30)
        case '1H':  ten_days_earlier = now - timedelta(hours=1)
    
    # ten_days_earlier = now - timedelta(days=10)
    time_to = int(now.timestamp())
    time_from = int(ten_days_earlier.timestamp())
    # print(time_from, time_to)

    return time_from, time_to

def out_xls_file(df: pd.DataFrame, sheet_name: str, mode: str):
    with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode=mode, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")


def save_calc_metrics(address, period, time_from, time_to):

    url = f"{d.SERVER_URL}calcMetrics?token={address}&period={period}"
    
    count = 0
    while True:

        try:
            response = requests.get(url)

            # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
            # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
            # response = requests.get(url, headers=headers)

            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response

                token_addr      = json_response.get('token')
                token_symbol    = json_response.get('symbol')

                items = json_response.get('records', [])
                print(len(items))

                # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

                processed_data = [{
                    "Bin":item['bin'],
                    "TimeStamp": item['timestamp'],
                    "FDV": item['fdv'],
                    "Initial Liquidity": item['initLiq'],
                    "Liquidity SOL": item['liqSol'],
                    "Total Volume": item['totalVolume'],
                    "Total Buy Volume": item['buyVolume'],
                    "Total Sell Volume": item['sellVolume'],
                    "Total Transactions": item['totalTx'],
                    "Total Buy Tx": item['buyTx'],
                    "Total Sell Tx": item['sellTx'],
                    "Total Holders": item['totalHolders'],
                    "Delta-FDV": item['deltaFdv'],
                    "Delta-Liquidity": item['deltaLiq'],
                    "Delta-Volume": item['deltaVolume'],
                    "Delta-Buy Volume": item['deltaBuyVolume'],
                    "Delta-Sell Volume": item['deltaSellVolume'],
                    "Delta-All Tx": item['deltaAllTx'],
                    "Delta-Buy Tx": item['deltaBuyTx'],
                    "Delta-Sell Tx": item['deltaSellTx'],
                    "Delta-Holders": item['deltaHolders']} for item in items]

                for item in processed_data:
                    print(f"delta = {item['Delta-Liquidity']}")
                # Assuming 'processed_data' is already defined and available
                df = pd.DataFrame(processed_data)

                # Debug print to check the final dataframe
                print(df.head())

                # with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
                #     df.to_excel(writer, sheet_name=token_symbol, index=False)

                # print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

                # out_xls_file(df, token_symbol, "w")

                return df, token_symbol

            else:
                print(f"{c.RED}Failed to fetch data for address {address}. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_calc_metrics] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_calc_metrics] count err{c.RESET}")            
            return pd.DataFrame(), "failed"
        
        count += 1

        time.sleep(2)

def save_calc_token(address, time_from, time_to):

    url = f"http://192.168.140.171:5050/api/calcHolders?token={address}&period=3600"
    # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
    
    response = requests.get(url)

    # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
    # response = requests.get(url, headers=headers)

    if response.status_code == 200:
        json_response = response.json()  # Get the JSON response
        items = json_response.get('holders', [])
        print(len(items))

        processed_data = [{
            "Id": item['_id'],
            "tx_count": item['tx_count']
        } for item in items]

        # Assuming 'processed_data' is already defined and available
        df = pd.DataFrame(processed_data)

        # # Now that the DataFrame has been padded, you can calculate SMA20 without issues
        df['token'] = json_response.get('token')
        df['holder_cnt'] = json_response.get('holder_cnt')

        # Debug print to check the final dataframe
        print(df.head())

        # writer = pd.ExcelWriter(d.EXPORT_EXCEL_PATH, engine='openpyxl')

        # # Write the DataFrame to the Excel file
        # df.to_excel(writer, index=False)

        # # Save the Excel file
        # writer.save()

        with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name='Holders')

        return df

    else:
        print(f"Failed to fetch data for address {address}. Status code: {response.status_code}")
        return pd.DataFrame()

def save_calc_address(address, time_from, time_to):

    url = f"http://192.168.140.171:5050/api/calcVolume?token={address}&period=3600"
    # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
    
    response = requests.get(url)

    # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
    # response = requests.get(url, headers=headers)

    if response.status_code == 200:
        json_response = response.json()  # Get the JSON response
        items = json_response.get('holders', [])
        print(len(items))

        processed_data = [{
            "Id": item['_id'],
            "tx_count": item['tx_count']
        } for item in items]

        # Assuming 'processed_data' is already defined and available
        df = pd.DataFrame(processed_data)

        # # Now that the DataFrame has been padded, you can calculate SMA20 without issues
        df['token'] = json_response.get('token')
        df['holder_cnt'] = json_response.get('holder_cnt')

        # Debug print to check the final dataframe
        print(df.head())

        # writer = pd.ExcelWriter(d.EXPORT_EXCEL_PATH, engine='openpyxl')

        # # Write the DataFrame to the Excel file
        # df.to_excel(writer, index=False)

        # # Save the Excel file
        # writer.save()

        with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='a', engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name='Holders')

        return df

    else:
        print(f"Failed to fetch data for address {address}. Status code: {response.status_code}")
        return pd.DataFrame()

def save_calc_txs(address, time_from, time_to):

    url = f"http://192.168.140.171:5050/api/calcTxs?token={address}&period=3600"
    # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
    
    response = requests.get(url)

    # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
    # response = requests.get(url, headers=headers)

    if response.status_code == 200:
        json_response = response.json()  # Get the JSON response
        items = json_response.get('holders', [])
        print(len(items))

        processed_data = [{
            "Id": item['_id'],
            "tx_count": item['tx_count']
        } for item in items]

        # Assuming 'processed_data' is already defined and available
        df = pd.DataFrame(processed_data)

        # # Now that the DataFrame has been padded, you can calculate SMA20 without issues
        df['token'] = json_response.get('token')
        df['holder_cnt'] = json_response.get('holder_cnt')

        # Debug print to check the final dataframe
        print(df.head())

        # writer = pd.ExcelWriter(d.EXPORT_EXCEL_PATH, engine='openpyxl')

        # # Write the DataFrame to the Excel file
        # df.to_excel(writer, index=False)

        # # Save the Excel file
        # writer.save()

        with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='a', engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name='Holders')

        return df

    else:
        print(f"Failed to fetch data for address {address}. Status code: {response.status_code}")
        return pd.DataFrame()

def fetch_token_history(address):
    
    url = f"{d.SERVER_URL}fetchTokenHistory?token={address}"

    while True:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response
                state = json_response.get('state')

                if state == 0: # 
                    df, token_symbol = save_calc_metrics(address, 5, 0, 0)
                    out_xls_file(df, f"{token_symbol}", "w")
                    percent = 10000
                else:
                    percent = json_response.get('percent_100')

                return int(percent)
            
            else:
                print(f"[fetch_token_history] Failed to fetch data for address {address}. Status code: {response.status_code}")
                return -1
        except:
            print(f"[fetch_token_history] -> Exception err")
            time.sleep(2)
            

def main():
    
    print(f"{c.GREEN}****************** Main Starting... ******************{c.RESET}")

    time_from, time_to =  get_time_range(d.INTERVAL_TIME_TYPE)

    TOKEN_ADDR  = d.TOKEN_ADDR
    period      = d.PERIOD

    df, token_symbol = save_calc_metrics(TOKEN_ADDR, period, time_from, time_to)

    # if token_symbol != "failed":
    #     out_xls_file(df, token_symbol, "w")
    
    # cur_percent = fetch_token_history(TOKEN_ADDR)
    # prev_percent = 0

    # for n in track(range(10000), description="Processing..."):        

    #     prev_percent = n
        
    #     while True and prev_percent > cur_percent :

    #         cur_percent = fetch_token_history(TOKEN_ADDR)
    #         print(cur_percent)

    #         if cur_percent - prev_percent > 0 :            
    #             break

    #         time.sleep(5)

    #     # time.sleep(0.001)


CHAIN = 'solana'

async def hello():
    url = f"wss://public-api.birdeye.so/socket/{CHAIN}?x-api-key={d.BIRDEYE_API_KEY}"
    # url = "ws://localhost:5000"

    async with websockets.connect(url) as websocket1:
        subscription_payload = {
            "type": "SUBSCRIBE_TXS",
            "data": {            
                "address": "So11111111111111111111111111111111111111112"
            }
        }

        await websocket1.send(json.dumps(subscription_payload))
        # await websocket.send("Hello, Server!")

        while True:
            response = await websocket1.recv()
            response_data = json.loads(response)
            print(response_data)
            # if "params" in response_data and "result" in response_data["params"]:
            #     transaction_hash = response_data["params"]["result"]['transaction']['hash']
            #     queue.append(transaction_hash)

# if __name__ == "__main__":
#     main()
    # asyncio.run(hello())    

    # manager = enlighten.get_manager()
    # pbar = manager.counter(total=10000, desc='Progress...')

    # for i in range(1, 10001):
    #     pbar.update()
    #     # print(i)
    #     time.sleep(0.1)



# import websocket
# import _thread
# import time
# import rel

# def on_message(ws, message):
#     print(f'Recv:  {message}')

# def on_error(ws, error):
#     print(error)

# def on_close(ws, close_status_code, close_msg):
#     print("### closed ###")

# def on_open(ws):
#     print("Opened connection")
#     ws.send("Opened connection")

# if __name__ == "__main__":
#     # websocket.enableTrace(True)
#     url = f"ws://localhost:8000"
#     # url = "ws://api.gemini.com/v1/marketdata/BTCUSD"
#     ws = websocket.WebSocketApp(url,
#                               on_open=on_open,
#                               on_message=on_message,
#                               on_error=on_error,
#                               on_close=on_close)

#     ws.run_forever(dispatcher=rel, reconnect=30)  # Set dispatcher to automatic reconnection, 5 second reconnect delay if connection closed unexpectedly  
#     rel.signal(2, rel.abort)  # Keyboard Interrupt
#     rel.dispatch()