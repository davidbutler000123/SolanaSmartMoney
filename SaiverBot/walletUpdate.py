
import config as d  # Assuming this module contains your API key
from sub import constants as c
from sub import functions as f
import time 
import pandas as pd

def main():
    
    print(f"{c.GREEN}****************** Wallet Update Starting... ******************{c.RESET}")
 
    filepath = "./walletList.xlsx"
    df = f.read_xls_file(filepath)

    if df.empty:
        print(f"{c.RED}Please enter wallet list info...{c.RESET}")        
        return

    walletData = []

    for x,y in df.items():
        # print(x) # label : column name
        # print(y) # content: data value
        new_item = {           
            "wallets" : [item for item in y.to_list() if pd.notna(item)],
            "type": x
        }

        walletData.append(new_item)

    for item in walletData:
        f.bot_updateWallets(item)

    print(f"{c.GREEN}****************** Wallet Update End... ******************{c.RESET}")

    
if __name__ == "__main__":
    main()
