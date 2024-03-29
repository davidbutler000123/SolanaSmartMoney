import pandas as pd
import requests, time, os
import dontshare as d  # Assuming this module contains your API key
from datetime import datetime, timedelta
import pandas_ta as ta 

import constants as c

import numpy as np

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
    print(time_from, time_to)

    return time_from, time_to

def save_calc_liquidity(address, time_from, time_to):

    url = f"http://192.168.140.171:5050/api/calcLiquidity?token={address}&period=3600"
    # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
    
    response = requests.get(url)
    

    # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
    # response = requests.get(url, headers=headers)

    if response.status_code == 200:
        json_response = response.json()  # Get the JSON response
        items = json_response.get('txs', [])
        print(len(items))

        # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

        # Create a list of dictionaries with only the relevant data and the new human-readable time column
        # processed_data = [{
        #     'Datetime (UTC)': datetime.utcfromtimestamp(item['unixTime']).strftime('%Y-%m-%d %H:%M:%S'),
        #     'Open': item['o'],
        #     'High': item['h'],
        #     'Low': item['l'],
        #     'Close': item['c'],
        #     'Volume': item['v'],
        #     'Address': item['address']
        # } for item in items]

        processed_data = [{
        "Id": item['_id'],
        "blockUnixTime": item['blockUnixTime'],
        "source": item['source'],
        "owner": item['owner'],
        "token": item['token'],
        "LP Type": item['type'],
        "typeSwap": item['typeSwap'],
        "side": item['side'],
        "total": item['total'],
        "tradeSymbol": item['tradeSymbol'],
        "fromSymbol": item['fromSymbol'],
        "toSymbol": item['toSymbol'],
        "Version": item['__v']} for item in items]

        # Assuming 'processed_data' is already defined and available
        df = pd.DataFrame(processed_data)

        # Check if the DataFrame has fewer than 40 rows
        # if len(df) < 40:
        #     # Calculate the number of rows to replicate
        #     rows_to_add = 40 - len(df)
            
        #     # Replicate the first row
        #     first_row_replicated = pd.concat([df.iloc[0:1]] * rows_to_add, ignore_index=True)
            
        #     # Append the replicated rows to the start of the DataFrame
        #     df = pd.concat([first_row_replicated, df], ignore_index=True)

        # # Now that the DataFrame has been padded, you can calculate SMA20 without issues
        # df['MA20'] = ta.sma(df['Close'], length=20)

        # # Continue with the rest of your calculations
        # df['RSI'] = ta.rsi(df['Close'], length=14)
        # df['MA40'] = ta.sma(df['Close'], length=40)

        # df['Price_above_MA20'] = df['Close'] > df['MA20']
        # df['Price_above_MA40'] = df['Close'] > df['MA40']
        # df['MA20_above_MA40'] = df['MA20'] > df['MA40']

        # Debug print to check the final dataframe
        print(df.head())

        # writer = pd.ExcelWriter(d.EXPORT_EXCEL_PATH, engine='openpyxl')

        # # Write the DataFrame to the Excel file
        # df.to_excel(writer, index=False)

        # # Save the Excel file
        # writer.save()

        with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name='Liquidity')

        return df

    else:
        print(f"Failed to fetch data for address {address}. Status code: {response.status_code}")
        return pd.DataFrame()

def save_calc_holder(address, time_from, time_to):

    url = f"http://192.168.140.171:5050/api/calcHolders?token={address}&period=3600"
    # url = f"https://public-api.birdeye.so/defi/ohlcv?address={address}&type={d.INTERVAL_TIME_TYPE}&time_from={time_from}&time_to={time_to}"
    
    response = requests.get(url)
    

    # headers = {"X-API-KEY": d.BIRDEYE_KEY, "Content-Type":"application/json", "x-chain":"solana"}
    # response = requests.get(url, headers=headers)

    if response.status_code == 200:
        json_response = response.json()  # Get the JSON response
        items = json_response.get('holders', [])
        print(len(items))

        # items = json_response.get('data', {}).get('items', [])  # Safely access the 'items' list

        # Create a list of dictionaries with only the relevant data and the new human-readable time column
        # processed_data = [{
        #     'Datetime (UTC)': datetime.utcfromtimestamp(item['unixTime']).strftime('%Y-%m-%d %H:%M:%S'),
        #     'Open': item['o'],
        #     'High': item['h'],
        #     'Low': item['l'],
        #     'Close': item['c'],
        #     'Volume': item['v'],
        #     'Address': item['address']
        # } for item in items]

        processed_data = [{
            "Id": item['_id'],
            "tx_count": item['tx_count']
        } for item in items]

        # Assuming 'processed_data' is already defined and available
        df = pd.DataFrame(processed_data)

        # Check if the DataFrame has fewer than 40 rows
        # if len(df) < 40:
        #     # Calculate the number of rows to replicate
        #     rows_to_add = 40 - len(df)
            
        #     # Replicate the first row
        #     first_row_replicated = pd.concat([df.iloc[0:1]] * rows_to_add, ignore_index=True)
            
        #     # Append the replicated rows to the start of the DataFrame
        #     df = pd.concat([first_row_replicated, df], ignore_index=True)

        # # Now that the DataFrame has been padded, you can calculate SMA20 without issues
        # df['MA20'] = ta.sma(df['Close'], length=20)

        # # Continue with the rest of your calculations
        # df['RSI'] = ta.rsi(df['Close'], length=14)
        # df['MA40'] = ta.sma(df['Close'], length=40)

        # df['Price_above_MA20'] = df['Close'] > df['MA20']
        # df['Price_above_MA40'] = df['Close'] > df['MA40']
        # df['MA20_above_MA40'] = df['MA20'] > df['MA40']

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


def main():
    
    print(f"{c.GREEN}****************** Main Staring... ******************{c.RESET}")

    # df = pd.DataFrame(np.random.randn(10, 4),
    #     index = pd.date_range('1/1/2000', periods=10),
    #     columns = ['A', 'B', 'C', 'D'])

    # print(df)
    # df.to_excel("./output/out.xlsx")
    # r = df.rolling(window=3,min_periods=1)

    # print(r)

    time_from, time_to =  get_time_range(d.INTERVAL_TIME_TYPE)

    TOKEN_ADDR = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

    save_calc_liquidity(TOKEN_ADDR, time_from, time_to)
    save_calc_holder(TOKEN_ADDR, time_from, time_to)


    
if __name__ == "__main__":
    main()