import config as d
from sub import constants as c
from sub import functions as f

def main():
    
    print(f"{c.GREEN}****************** Address analysis Starting... ******************{c.RESET}")

    # Address Analysis
    rankSize    = d.RANK_SIZE
    wallet      = d.TOP_TRADER_WALLET
    filterMode  = d.FILTER_ZERO_COST
    sortMode    = d.PNL_SORT_MODE

    if wallet != '':
        df, sheet_name = f.save_calc_TopTrader(wallet, rankSize, filterMode, sortMode)

        if sheet_name != "failed":
            f.out_xls_file(df, sheet_name, "w")
    else:
        print(f"{c.RED}****************** Please enter wallet in dontshare.py ******************{c.RESET}")


    print(f"{c.GREEN}****************** Address analysis End... ******************{c.RESET}")

if __name__ == "__main__":
    main()
