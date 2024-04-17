import dontshare as d
import constants as c
import functions as f

def main():
    
    print(f"{c.GREEN}****************** Token Metrics Starting... ******************{c.RESET}")

    # time_from, time_to =  f.get_time_range(d.INTERVAL_TIME_TYPE)

    tokenAddress    = d.TOKEN_ADDR
    period          = d.PERIOD

    # Token
    if tokenAddress != '':

        df, sheet_name = f.save_calc_metrics(tokenAddress, period)

        if sheet_name != "failed":
            f.out_xls_file(df, sheet_name, "w")
    else:
        print(f"{c.RED}****************** Please enter token address in dontshare.py ******************{c.RESET}")    

    print(f"{c.GREEN}****************** Token Metrics End ******************{c.RESET}")

if __name__ == "__main__":
    main()
