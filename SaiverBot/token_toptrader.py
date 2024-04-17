import dontshare as d  # Assuming this module contains your API key
import constants as c
import functions as f

def main():
    
    print(f"{c.GREEN}****************** Token Top trader Starting... ******************{c.RESET}")
    
    # Token Analysis
    
    tokenAddress    = d.TOKEN_ADDR
    ranksize        = d.RANK_SIZE
    filterZero      = d.FILTER_ZERO_COST
    sortMode        = d.PNL_SORT_MODE

    if tokenAddress != '':
        df, sheet_name = f.save_calc_PnlPerToken(tokenAddress, ranksize, filterZero, sortMode)

        if sheet_name != "failed":
            f.out_xls_file(df, sheet_name, "w")
    else:
        print(f"{c.RED}****************** Please enter token address in dontshare.py ******************{c.RESET}")    

    print(f"{c.GREEN}****************** Token Top trader End... ******************{c.RESET}")

if __name__ == "__main__":
    main()
