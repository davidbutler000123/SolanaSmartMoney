import dontshare as d
import constants as c
import functions as f

def main():
    
    print(f"{c.GREEN}****************** Leaderboard Starting... ******************{c.RESET}")

    # Token Leaderboard
    
    ranksize        = d.RANK_SIZE
    filterZero      = d.FILTER_ZERO_COST
    filterAtLeast   = d.TOKEN_ATLEAST_TRADED
    sortMode        = d.PNL_SORT_MODE

    df, sheet_name = f.save_sort_wallets(ranksize, filterZero, filterAtLeast, sortMode)

    if sheet_name != "failed":
        f.out_xls_file(df, sheet_name, "w")

    print(f"{c.GREEN}****************** Leaderboard End... ******************{c.RESET}")

if __name__ == "__main__":
    main()
