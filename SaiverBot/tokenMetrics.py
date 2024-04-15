import dontshare as d  # Assuming this module contains your API key
import constants as c
import functions as f

def main():
    
    print(f"{c.GREEN}****************** Main Starting... ******************{c.RESET}")

    time_from, time_to =  f.get_time_range(d.INTERVAL_TIME_TYPE)

    TOKEN_ADDR  = d.TOKEN_ADDR
    period      = d.PERIOD

    # Token sheet
    df, token_symbol = f.save_calc_metrics(TOKEN_ADDR, period, time_from, time_to)

    if token_symbol != "failed":
        f.out_xls_file(df, token_symbol, "w")

    # Token Analysis
    ranksize    = d.RANK_SIZE
    df, sheet_name = f.save_calc_PnlPerToken(TOKEN_ADDR, ranksize, token_symbol)

    if sheet_name != "failed":
        f.out_xls_file(df, sheet_name, "a")

    # Token Leaderboard
    # ranksize    = d.RANK_SIZE
    df, sheet_name, wallet = f.save_sort_wallets(ranksize)

    if sheet_name != "failed":
        f.out_xls_file(df, sheet_name, "a")


    # Address Analysis
    # ranksize    = d.RANK_SIZE
    df, sheet_name = f.save_calc_TopTrader(wallet, ranksize)

    if sheet_name != "failed":
        f.out_xls_file(df, sheet_name, "a")


    print(f"{c.GREEN}****************** Main End... ******************{c.RESET}")

if __name__ == "__main__":
    main()
