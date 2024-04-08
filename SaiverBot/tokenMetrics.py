import dontshare as d  # Assuming this module contains your API key
import constants as c
import functions as f

def main():
    
    print(f"{c.GREEN}****************** Main Starting... ******************{c.RESET}")

    time_from, time_to =  f.get_time_range(d.INTERVAL_TIME_TYPE)

    TOKEN_ADDR  = d.TOKEN_ADDR
    period      = d.PERIOD

    df, token_symbol = f.save_calc_metrics(TOKEN_ADDR, period, time_from, time_to)

    if token_symbol != "failed":
        f.out_xls_file(df, token_symbol, "w")

    print(f"{c.GREEN}****************** Main End... ******************{c.RESET}")

if __name__ == "__main__":
    main()
