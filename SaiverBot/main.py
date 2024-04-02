import pandas as pd
import requests, time, os
import dontshare as d  # Assuming this module contains your API key
from datetime import datetime, timedelta

import constants as c


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

def save_calc_metrics(address, period, time_from, time_to):

    url = f"{d.SERVER_URL}calcMetrics?token={address}&period={period}"
    
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

        # Assuming 'processed_data' is already defined and available
        df = pd.DataFrame(processed_data)

        # Debug print to check the final dataframe
        print(df.head())

        with pd.ExcelWriter(d.EXPORT_EXCEL_PATH, mode='w', engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=token_symbol, index=False)

        print(f"{c.GREEN}Exporting Excel file successful!{c.RESET}")

        return df

    else:
        print(f"{c.RED}Failed to fetch data for address {address}. Status code: {response.status_code}{c.RESET}")
        return pd.DataFrame()

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

def main():
    
    print(f"{c.GREEN}****************** Main Starting... ******************{c.RESET}")

    time_from, time_to =  get_time_range(d.INTERVAL_TIME_TYPE)

    TOKEN_ADDR  = d.TOKEN_ADDR
    period      = d.PERIOD

    save_calc_metrics(TOKEN_ADDR, period, time_from, time_to)
    # save_calc_holder(TOKEN_ADDR, time_from, time_to)


    
if __name__ == "__main__":
    main()