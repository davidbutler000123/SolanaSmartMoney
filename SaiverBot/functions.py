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
                    "Renounced": item['renounced'],
                    "Burned": item['burned'],
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
                print(f"{c.RED}[save_calc_metrics] Failed to fetch data for address {address}. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_calc_metrics] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_calc_metrics] count err{c.RESET}")            
            return pd.DataFrame(), "failed"
        
        count += 1

        time.sleep(2)

def save_calc_PnlPerToken(address, ranksize, token_symbol):

    url = f"{d.SERVER_URL}calcPnlPerToken?token={address}&rankSize={ranksize}"
    
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
                    "PNL": item['pnlPercent']
                    } for item in items]

                # Assuming 'processed_data' is already defined and available
                df = pd.DataFrame(processed_data)

                # Debug print to check the final dataframe
                print(df.head())

                # with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
                #     df.to_excel(writer, sheet_name=token_symbol, index=False)

                # print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

                # out_xls_file(df, token_symbol, "w")

                sheet_name = f'Token Analysis({token_symbol})'
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

def save_calc_TopTrader(address, ranksize):

    url = f"{d.SERVER_URL}calcTopTrader?wallet={address}&rankSize={ranksize}"
    
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

def save_sort_wallets(ranksize):

    url = f"{d.SERVER_URL}sortWallets?rankSize={ranksize}"
    
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

                return df, sheet_name, wallet

            else:
                print(f"{c.RED}[save_sort_wallets] Failed to fetch data. Status code: {response.status_code}{c.RESET}")
                # return pd.DataFrame(), "failed"
                
        except:
            print(f"{c.RED}[save_sort_wallets] exception err{c.RESET}")
        
        if count > 3:
            print(f"{c.RED}[save_sort_wallets] count err{c.RESET}")            
            return pd.DataFrame(), "failed", None
        
        count += 1

        time.sleep(2)

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
