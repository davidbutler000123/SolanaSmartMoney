import pandas as pd
import requests, time, os
import config as d  # Assuming this module contains your API key
from datetime import datetime, timedelta

from sub import constants as c

import asyncio
import websockets
import json

import websocket
# import thread

import time 
from rich.progress import track
import enlighten

import httpx

from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

import time
import math

def get_time_now():    

    now = datetime.now()    
    cur_time = datetime.utcfromtimestamp(now.timestamp()).strftime('%Y-%m-%d %H:%M:%S') # 2024-05-16 10:36:21

    # return math.ceil(now.timestamp())
    return cur_time
    
def get_unixtime(unixtime):
    
    second = unixtime / 1000
    # another_time = datetime.fromtimestamp(second)
    another_time = time.strftime("%a, %d %b %Y %H:%M:%S +0000", time.localtime(second)) # Thu, 16 May 2024 18:47:14 +0000

    return another_time

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
    
    file_path = f'{d.EXPORT_EXCEL_PATH}{sheet_name}.xlsx'

    with pd.ExcelWriter(file_path, mode=mode, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"{c.GREEN}Exporting [{sheet_name}] Excel file successful!{c.RESET}")

def out_xls_sheet(df: pd.DataFrame, sheet_name: str, mode: str):
    
    file_path = f'{d.EXPORT_EXCEL_PATH}.xlsx'

    with pd.ExcelWriter(file_path, mode=mode, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"{c.GREEN}Exporting [{sheet_name}] Excel Sheet file successful!{c.RESET}")

def read_xls_sheet(file_path: str, sheetName: str):

    b_read = False
    try:
        # Read the Excel file
        df = pd.read_excel(file_path, sheet_name=sheetName)

        # Check if the file is not empty
        if not df.empty:
            # Read the first record (row) from the DataFrame
            # first_record = df.iloc[0]
            b_read = True

            # print(first_record)
        else:            
            print("The Excel file is empty.")

    except FileNotFoundError:
        print(f"File '{file_path}' not found.")
        
    except Exception as e:
        print("An error occurred:", e)

    if b_read is False:
        return pd.DataFrame()
    
    return df

def read_xls_file(file_path: str):

    b_read = False
    try:
        # Read the Excel file
        df = pd.read_excel(file_path)        

        # Check if the file is not empty
        if not df.empty:
            # Read the first record (row) from the DataFrame
            # first_record = df.iloc[0]            
            b_read = True

            # print(first_record)
        else:            
            print("The Excel file is empty.")

    except FileNotFoundError:
        print(f"File '{file_path}' not found.")
        
    except Exception as e:
        print("An error occurred:", e)

    if b_read is False:
        return pd.DataFrame()
    
    return df

def save_calc_metrics(address, period):

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

                # "bin": 1,
                # "timestamp": "3/14/2024 7:00:00 AM",
                # "renounced": 0,
                # "burned": 0,
                # "fdvUsd": 10745635.739374345,
                # "fdvSol": 63798.22861025931,
                # "mcUsd": 5372817.868129834,
                # "mcSol": 31899.114295883533,
                # "priceUsd": 0.00015573385034733518,
                # "priceSol": 9.246120032162648e-7,
                # "initLiqSol": 10132,
                # "initLiqUsd": 1706548.6563342111,
                # "liqSol": 10200.244576823998,
                # "liqUsd": 1718043.1974792064,
                # "totalVolumeUsd": 12023.14476856188,
                # "totalVolumeSol": 71.38296487645647,
                # "buyVolumeUsd": 282.33501356942776,
                # "buyVolumeSol": 1.6762594766153667,
                # "sellVolumeUsd": 11740.809754992453,
                # "sellVolumeSol": 69.7067053998411,
                # "totalTx": 120,
                # "buyTx": 16,
                # "sellTx": 103,
                # "totalHolders": 75,
                # "deltaFdvUsd": 0,
                # "deltaFdvSol": 0,
                # "deltaLiq": 10200.244576823998,
                # "deltaVolumeUsd": 3781685.961010627,
                # "deltaVolumeSol": 22452.35845737049,
                # "deltaBuyVolumeUsd": 1236782.594351536,
                # "deltaBuyVolumeSol": 7342.938157349361,
                # "deltaSellVolumeUsd": 2544903.3666590992,
                # "deltaSellVolumeSol": 15109.420300021176,
                # "deltaAllTx": 4755,
                # "deltaBuyTx": 1202,
                # "deltaSellTx": 3552,
                # "deltaHolders": 1615

                # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

                denomiate   = d.DENOMINATE
                show_delta  = d.SHOW_DELTA

                processed_data = [{
                    "Bin":item['bin'],
                    "TimeStamp": item['timestamp'],
                    "FDV(USD)": item['fdvUsd'],
                    "FDV(SOL)": item['fdvSol'],
                    "Renounced": item['renounced'],
                    "Burned": item['burned'],
                    # "Market cap(SOL)": item['mcSol'],
                    # "Market cap(USD)": item['mcUsd'],
                    "Price(SOL)": item['priceSol'],
                    "Price(USD)": item['priceUsd'],
                    "Initial Liquidity(SOL)": item['initLiqSol'],
                    "Initial Liquidity(USD)": item['initLiqUsd'],
                    "Liquidity(SOL)": item['liqSol'],
                    "Liquidity(USD)": item['liqUsd'],
                    "Total Volume(USD)": item['totalVolumeUsd'],
                    "Total Volume(SOL)": item['totalVolumeSol'],
                    "Total Buy Volume(USD)": item['buyVolumeUsd'],
                    "Total Buy Volume(SOL)": item['buyVolumeSol'],
                    "Total Sell Volume(USD)": item['sellVolumeUsd'],
                    "Total Sell Volume(SOL)": item['sellVolumeSol'],
                    "Total Transactions": item['totalTx'],
                    "Total Buy Tx": item['buyTx'],
                    "Total Sell Tx": item['sellTx'],
                    "Total Holders": item['totalHolders'],
                    "Delta-FDV(USD)": item['deltaFdvUsd'],
                    "Delta-FDV(SOL)": item['deltaFdvSol'],
                    "Delta-Liquidity": item['deltaLiq'],
                    "Delta-Volume(USD)": item['deltaVolumeUsd'],
                    "Delta-Volume(SOL)": item['deltaVolumeSol'],
                    "Delta-Buy Volume(USD)": item['deltaBuyVolumeUsd'],
                    "Delta-Buy Volume(SOL)": item['deltaBuyVolumeSol'],
                    "Delta-Sell Volume(USD)": item['deltaSellVolumeUsd'],
                    "Delta-Sell Volume(SOL)": item['deltaSellVolumeSol'],
                    "Delta-All Tx": item['deltaAllTx'],
                    "Delta-Buy Tx": item['deltaBuyTx'],
                    "Delta-Sell Tx": item['deltaSellTx'],
                    "Delta-Holders": item['deltaHolders']} for item in items]

                # Assuming 'processed_data' is already defined and available
                df = pd.DataFrame(processed_data)

                # items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(SOL)", "Price(USD)", 
                #         "Initial Liquidity(SOL)", "Initial Liquidity(USD)", "Liquidity(SOL)", "Liquidity(USD)", "Total Volume(USD)",
                #         "Total Volume(SOL)", "Total Buy Volume(USD)", "Total Buy Volume(SOL)", "Total Sell Volume(USD)", "Total Sell Volume(SOL)",
                #         "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders", "Delta-FDV(USD)", "Delta-FDV(SOL)", "Delta-Liquidity",
                #         "Delta-Volume(USD)", "Delta-Volume(SOL)", "Delta-Buy Volume(USD)", "Delta-Buy Volume(SOL)", "Delta-Sell Volume(USD)", "Delta-Sell Volume(SOL)",
                #         "Delta-All Tx", "Delta-Buy Tx", "Delta-Sell Tx", "Delta-Holders"]
                
                # items = []
                if denomiate == 'SOL':
                    if show_delta:
                        fil_items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(SOL)", "Initial Liquidity(SOL)", "Liquidity(SOL)", 
                             "Total Volume(SOL)", "Total Buy Volume(SOL)", "Total Sell Volume(SOL)", "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders", "Delta-FDV(SOL)", "Delta-Liquidity",
                             "Delta-Volume(SOL)", "Delta-Buy Volume(SOL)", "Delta-Sell Volume(SOL)", "Delta-All Tx", "Delta-Buy Tx", "Delta-Sell Tx", "Delta-Holders"]
                    else:
                        fil_items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(SOL)", "Initial Liquidity(SOL)", "Liquidity(SOL)", 
                             "Total Volume(SOL)", "Total Buy Volume(SOL)", "Total Sell Volume(SOL)", "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders"]
                    
                elif denomiate == 'USD':
                    if show_delta:
                        fil_items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(USD)", "Initial Liquidity(USD)", "Liquidity(USD)", "Total Volume(USD)",
                             "Total Buy Volume(USD)", "Total Sell Volume(USD)", "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders", "Delta-FDV(USD)", "Delta-Liquidity",
                             "Delta-Volume(USD)", "Delta-Buy Volume(USD)", "Delta-Sell Volume(USD)", "Delta-All Tx", "Delta-Buy Tx", "Delta-Sell Tx", "Delta-Holders"]
                    else:
                        fil_items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(USD)", "Initial Liquidity(USD)", "Liquidity(USD)", "Total Volume(USD)",
                                "Total Buy Volume(USD)", "Total Sell Volume(USD)", "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders"]
                elif denomiate == 'BOTH':
                    if show_delta:
                        fil_items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(SOL)", "Price(USD)", 
                                "Initial Liquidity(SOL)", "Initial Liquidity(USD)", "Liquidity(SOL)", "Liquidity(USD)", "Total Volume(USD)",
                                "Total Volume(SOL)", "Total Buy Volume(USD)", "Total Buy Volume(SOL)", "Total Sell Volume(USD)", "Total Sell Volume(SOL)",
                                "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders", "Delta-FDV(USD)", "Delta-FDV(SOL)", "Delta-Liquidity",
                                "Delta-Volume(USD)", "Delta-Volume(SOL)", "Delta-Buy Volume(USD)", "Delta-Buy Volume(SOL)", "Delta-Sell Volume(USD)", "Delta-Sell Volume(SOL)",
                                "Delta-All Tx", "Delta-Buy Tx", "Delta-Sell Tx", "Delta-Holders"]
                    else:
                        fil_items = ["Bin", "TimeStamp", "FDV(USD)", "FDV(SOL)", "Renounced", "Burned", "Price(SOL)", "Price(USD)", 
                                "Initial Liquidity(SOL)", "Initial Liquidity(USD)", "Liquidity(SOL)", "Liquidity(USD)", "Total Volume(USD)",
                                "Total Volume(SOL)", "Total Buy Volume(USD)", "Total Buy Volume(SOL)", "Total Sell Volume(USD)", "Total Sell Volume(SOL)",
                                "Total Transactions", "Total Buy Tx", "Total Sell Tx", "Total Holders"]


                # print(fil_items)

                newDf = df.filter(items=fil_items)
                # Debug print to check the final dataframe
                print(newDf.head())

                # with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
                #     df.to_excel(writer, sheet_name=token_symbol, index=False)

                # print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

                # out_xls_file(df, token_symbol, "w")

                return newDf, token_symbol

            else:
                print(f"{c.RED}[save_calc_metrics] Failed to fetch data for address {address}. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_calc_metrics] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_calc_metrics] count err{c.RESET}")            
            return pd.DataFrame(), "failed"
        
        count += 1

        time.sleep(2)

def save_calc_PnlPerToken(address, ranksize, filterZero, sortMode):

    url = f"{d.SERVER_URL}calcPnlPerToken?token={address}&rankSize={ranksize}&filterZero={filterZero}&sortMode={sortMode}"
    
    count = 0
    while True:

        try:
            response = requests.get(url)

            # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
            # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
            # response = requests.get(url, headers=headers)

            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response
                
                items = json_response
                print(len(items))

                # "wallet": "7rhxnLV8C77o6d8oz26AgK8x8m5ePsdeRawjqvojbjnQ",
                # "ranking": 1,
                # "holdingTime": 646,
                # "profit": 8143.371946611,
                # "cost": 7544.861968787,
                # "pnl": 8143.371946611,
                # "pnlPercent": 107

                # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

                processed_data = [{
                    "Ranking":item['ranking'],
                    "Address": item['wallet'],
                    "Holding Time(mins)": item['holdingTime'],
                    "Cost(SOL)": item['cost'],
                    "Realized PNL(SOL)": item['pnl'],
                    "PNL(%)": item['pnlPercent']
                    } for item in items]

                # Assuming 'processed_data' is already defined and available
                df = pd.DataFrame(processed_data)

                # Debug print to check the final dataframe
                print(df.head())

                # with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
                #     df.to_excel(writer, sheet_name=token_symbol, index=False)

                # print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

                # out_xls_file(df, token_symbol, "w")

                sheet_name = f'Token Analysis'
                return df, sheet_name

            else:
                print(f"{c.RED}[save_calc_PnlPerToken] Failed to fetch data for address {address}. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_calc_PnlPerToken] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_calc_PnlPerToken] count err{c.RESET}")            
            return pd.DataFrame(), "failed"
        
        count += 1

        time.sleep(2)

def save_calc_TopTrader(address, ranksize, filterMode, sortMode):

    url = f"{d.SERVER_URL}calcTopTrader?wallet={address}&rankSize={ranksize}&filterZero={filterMode}&sortMode={sortMode}"
    
    count = 0
    while True:

        try:
            response = requests.get(url)

            # "token": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
            # "symbol": "$WIF",
            # "ranking": 1,
            # "holdingTime": 678,
            # "profit": 21278.682669717,
            # "cost": 10768.750754194,
            # "pnl": 21278.682669717,
            # "pnlPercent": 197

            # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
            # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
            # response = requests.get(url, headers=headers)

            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response

                items = json_response
                print(len(items))

                # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

                processed_data = [{
                    "Ranking":item['ranking'],
                    "Token Address":item['token'],
                    "Token Symbol": item['symbol'],
                    "Holding Time": item['holdingTime'],
                    "Cost(SOL)": item['cost'],
                    "Realized PNL(SOL)": item['pnl'],
                    "PNL(%)": item['pnlPercent']
                    } for item in items]

                # Assuming 'processed_data' is already defined and available
                df = pd.DataFrame(processed_data)

                # Debug print to check the final dataframe
                print(df.head())

                # with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
                #     df.to_excel(writer, sheet_name=token_symbol, index=False)

                # print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

                # out_xls_file(df, token_symbol, "w")

                sheet_name = f'Address analysis'

                return df, sheet_name

            else:
                print(f"{c.RED}[save_calc_TopTrader] Failed to fetch data for address {address}. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_calc_TopTrader] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_calc_TopTrader] count err{c.RESET}")            
            return pd.DataFrame(), "failed"
        
        count += 1

        time.sleep(2)

def save_sort_wallets(ranksize, filterZero, filterAtLeast, sortMode):

    url = f"{d.SERVER_URL}sortWallets?rankSize={ranksize}&filterZero={filterZero}&filterTokenAtleast={filterAtLeast}&sortMode={sortMode}"
    
    count = 0
    while True:

        try:
            response = requests.get(url)

            # "wallet": "4cCmCewnDi6MEoQNGz5xPNSejBhZNKq4NbvP4UmwyvgT",
            # "ranking": 4,
            # "totalProfit": 3080.5,
            # "cost": 0,
            # "winToken": 1,
            # "lossToken": 0,
            # "profitTokens": "SLERF",
            # "lossTokens": "",
            # "avgProfit": 3080.5,
            # "pnlRate": "Infinity%",
            # "winRate": "100%"

            # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
            # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
            # response = requests.get(url, headers=headers)

            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response

                items = json_response                
                print(len(items))

                wallet = None
                if len(items) > 0:
                    wallet = items[0]['wallet']

                # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

                processed_data = [{
                    "Ranking":item['ranking'],
                    "Wallet":item['wallet'],
                    "Total Profit(SOL)": item['totalProfit'],
                    "Total Cost(SOL)": item['cost'],
                    "Cost(SOL)": item['cost'],
                    "Win Token": item['winToken'],
                    "Loss Token": item['lossToken'],
                    "Profit Token": item['profitTokens'],
                    "Loss Tokens": item['lossTokens'],
                    "Average Profit(SOL)": item['avgProfit'],
                    "PNL(%)": item['pnlRate'],
                    "Win Rate": item['winRate']
                    } for item in items]

                # Assuming 'processed_data' is already defined and available
                df = pd.DataFrame(processed_data)

                # Debug print to check the final dataframe
                print(df.head())

                # with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
                #     df.to_excel(writer, sheet_name=token_symbol, index=False)

                # print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

                # out_xls_file(df, token_symbol, "w")

                sheet_name = f'Token Leaderboard'

                return df, sheet_name

            else:
                print(f"{c.RED}[save_sort_wallets] Failed to fetch data. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_sort_wallets] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_sort_wallets] count err{c.RESET}")            
            return pd.DataFrame(), "failed"
        
        count += 1

        time.sleep(2)

def fetch_token_history(address, fetchUntil):
    
    url = f"{d.SERVER_URL}fetchTokenHistory?token={address}&until={fetchUntil}"

    while True:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response
                state = json_response.get('state')

                if state == 0: # 
                    df, token_symbol = save_calc_metrics(address, d.PERIOD)

                    if d.SHOW_DELTA:
                        fileName = f"{token_symbol}({d.DENOMINATE}-Delta)"
                    else:
                        fileName = f"{token_symbol}({d.DENOMINATE})"
                    out_xls_file(df, fileName, "w")
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


# Alert Bot Function

def find_AlertingTokens():

    url = f"{d.SERVER_URL}findAlertingTokens?buyTxns={d.BUY_TXS}&holders={d.TOKEN_HOLDERS}"
    
    count = 0
    while True:

        try:
            response = requests.get(url)

            # "result": 0,
            # "count": 1,
            # "token": {
            #     "address": "ALXzL9Qbg5tkvTYcq1Yz1HHeyQrDVt25C5ZCVpc7yZX8",
            #     "name": "mr west's ",
            #     "symbol": "YE",
            #     "logoURI": "https://img.fotofolio.xyz/?url=https%3A%2F%2Fbafkreie5hohqcvijdsvm7tw3jr2dd5uuus6z7rtq2v37uw27kdcnjo4tzm.ipfs.nftstorage.link",
            #     "dexUrl": "https://dexscreener.com/solana/7xs43e91sfswgaf6qqebvlv8vhbkuqjjravwf7yzcfqy",
            #     "webSiteUrl": "",
            #     "telegramUrl": "",
            #     "twitterUrl": "",
            #     "buy": 18,
            #     "poolCreated": 1715967505838,
            #     "pairLifeTimeMins": 29,
            #     "initLiquidityUsd": 2349.4964817403556,
            #     "initLiquiditySol": 14,
            #     "fdvUsd": 1293,
            #     "fdvSol": 7.70462954113096,
            #     "liquidityUsd": 0.176547878485061,
            #     "liquiditySol": 0.001052,
            #     "holder_count": 24
            # }
            
            if response.status_code == 200:
                json_response = response.json()  # Get the JSON response

                items = json_response
                # print(len(items))

                # processed_data = []
                token_data = {}

                if items['count'] > 0: 

                    item = json_response.get('token', {})

                    token_data = {
                        "address":item['address'],
                        "name":item['name'],
                        "symbol":item['symbol'],
                        "logoURI":item['logoURI'],
                        "dexUrl":item['dexUrl'],
                        "webSiteUrl":item['webSiteUrl'],
                        "telegramUrl":item['telegramUrl'],
                        "twitterUrl":item['twitterUrl'],
                        "buyTxs": item['buy'],
                        "holders": item['holder_count'],
                        "poolCreatedTime": item['pairCreatedAt'],
                        "pairTimeInfo": item['pairLifeTimeMins'],
                        "initLiquiditySol": item['initLiquiditySol'],
                        "initLiquidityUsd": item['initLiquidityUsd'],
                        "fdvSol": item['fdvSol'],
                        "fdvUsd": item['fdvUsd'],
                        "liquiditySol": item['liquiditySol'],
                        "liquidityUsd": item['liquidityUsd']
                        }
                
                # processed_data.append(token_data)

                return token_data

            else:
                print(f"{c.RED}[find_AlertingTokens] Failed to fetch data. Status code: {response.status_code}{c.RESET}")
                
        except:
            print(f"{c.RED}[find_AlertingTokens] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[find_AlertingTokens] count err{c.RESET}")            
            return {}
        
        count += 1

        time.sleep(2)


def send_discord_alert(message: str):
    DISCORD_WEBHOOK_URL = d.DISCORD_WEBHOOK
    try:
        httpx.post(DISCORD_WEBHOOK_URL, json={'content': f'{message}'})
    except:
        pass

def send_telegram_message(message: str):
    
    TELEGRAM_BOT_TOKEN = d.BOT_TOKEN
    TELEGRAM_CHAT_ID = d.CHAT_ID
    TELEGRAM_URL = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage"
    PAYLOAD = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'parse_mode': 'HTML'
    }
    try:
        httpx.post(url=TELEGRAM_URL, data=PAYLOAD)
    except:
        print(f'send telegram alert error!')
        pass

def send_telegram_photo(url: str):
    
    TELEGRAM_BOT_TOKEN = d.BOT_TOKEN
    TELEGRAM_CHAT_ID = d.CHAT_ID

    with open(url, 'rb') as photo:
    # Prepare the POST request payload
        files = {'photo': photo}
        data = {'chat_id': TELEGRAM_CHAT_ID}       

        TELEGRAM_URL = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendPhoto"
        PAYLOAD = {
            'chat_id': TELEGRAM_CHAT_ID,
            'photo': photo,
        }

        try:
            # httpx.post(url=TELEGRAM_URL, data=PAYLOAD)
             # Send the HTTP POST request to the Telegram API
            response = requests.post(url=TELEGRAM_URL, files=files, data=data)
        except:
            print(f'send telegram alert error!')
            pass

def get_amount(inValue):

    result_0 = round(inValue, 1)
    result_K = round(float(inValue / 1000), 1)
    result_M = round(float(inValue / (1000 * 1000)), 1)
    
    if result_M > 1 :
        result = f'{result_M}M'
    elif result_K > 1:
        result = f'{result_K}K'
    else:
        result = f'{result_0}'

    return result

async def send_telegram_alert(bot_token, chat_id, token_info: str):

    print(token_info)

    address = token_info['address']
    name = token_info['name']
    symbol = token_info['symbol']
    logoURI = token_info['logoURI']
    dexUrl = token_info['dexUrl']
    webSiteUrl = token_info['webSiteUrl']
    telegramUrl = token_info['telegramUrl']
    twitterUrl = token_info['twitterUrl']
    buy_txs = token_info['buyTxs']
    holders = token_info['holders']
    pool_create_time = token_info['poolCreatedTime']
    pair_timeInfo = token_info['pairTimeInfo']
    initLiquiditySol = get_amount(token_info['initLiquiditySol'])
    initLiquidityUsd = get_amount(token_info['initLiquidityUsd'])
    fdvSol = get_amount(token_info['fdvSol'])
    fdvUsd = get_amount(token_info['fdvUsd'])
    liquiditySol = get_amount(token_info['liquiditySol'])
    liquidityUsd = get_amount(token_info['liquidityUsd'])

    if token_info['fdvSol'] == 0:
        lp_FDV = 0.0
    else:
        lp_FDV = round(token_info['liquiditySol'] / token_info['fdvSol'] * 100, 1)

    text_template = f'🌟 <a href="{dexUrl}">{name}</a> {symbol} triggers Alert 01 \
\n \
\n💵 Info  \
\nPairs: {pair_timeInfo} mins ago \
\nInitial LP: {initLiquiditySol} Ξ ({initLiquidityUsd}) \
\nFDV:  {fdvSol} Ξ ({fdvUsd}) \
\n  \
\n💦 LP \
\nLP: {liquiditySol} Ξ ({liquidityUsd}) \
\nLP / FDV: {lp_FDV}% \
\n \
\n🧠 Metrics \
\nBuy Tx: {buy_txs} \
\nHolders: {holders} \
\n \
\n📄 CA \
\n<code>{address}</code> \
\n \
\n{get_time_now()}  \
\n \
\n<a href="{telegramUrl}">Telegram</a> | <a href="{twitterUrl}">Twitter </a> | <a href="{webSiteUrl}">Website </a>'
    
    bot = Bot(token=bot_token)

    # Path to the picture you want to send
    picture_path = None #'./image/3.jpg'

    if picture_path is not None:
        # Send the picture to the channel
        with open(picture_path, 'rb') as picture:
            await bot.send_photo(chat_id=chat_id, photo=picture)
    
    try:
        if logoURI:
            await bot.send_photo(chat_id=chat_id, photo=logoURI, caption=text_template, parse_mode='HTML')
        else:
            await bot.send_message(chat_id=chat_id, text=text_template, parse_mode='HTML')
    except Exception as e:
        print(f'{c.RED}bot.sendPhoto telegram alert error!{c.RESET}')
        print(f'caught {type(e)}: {e.args}')
        print(f'caught {e}')
        pass

# Single/Group Wallet Alert bot setting

def bot_updateWallets(walletData):

    url_wallet = f"{d.SERVER_URL}updateSmartWallets"
    
    try:
        json_data = json.dumps(walletData)

        headers = {
            "Content-Type": "application/json",
            "jsonrpc": "2.0",
            "id": "1",
        }

        response = requests.post(url=url_wallet, data=json_data, headers=headers)

        if response.status_code == 200:
            json_response = response.json()  # Get the JSON response

            items = json_response

            print(f'{c.GREEN} ✅ Successfully {len(items)} wallet has been updated in {walletData["type"]} list {c.RESET}')

            return

        else:
            print(f"{c.RED}🚫 [bot_updateWallets] Failed to fetch data. Status code: {response.status_code}{c.RESET}")
            # return pd.DataFrame(), "failed"
            
    except Exception as e:
        print(f"{c.RED}🚫 [bot_updateWallets] exception err {e}{c.RESET}")
        
        
async def send_telegram_alert_test(bot_token, chat_id, token_info: str):
    
    bot = Bot(token=bot_token)

    logoURI = None

    text_template = "Test is text"
    
    # Path to the picture you want to send
    picture_path = None #'./image/3.jpg'

    if picture_path is not None:
        # Send the picture to the channel
        with open(picture_path, 'rb') as picture:
            await bot.send_photo(chat_id=chat_id, photo=picture)
    
    try:
        if logoURI:
            await bot.send_photo(chat_id=chat_id, photo=logoURI, caption=text_template, parse_mode='HTML')
        else:
            await bot.send_message(chat_id=chat_id, text=text_template, parse_mode='HTML')
    except Exception as e:
        print(f'{c.RED}bot.sendPhoto telegram alert error!{c.RESET}')
        print(f'caught {type(e)}: {e.args}')
        print(f'caught {e}')
        pass

# Single/Group Wallet Alert bot setting
    
