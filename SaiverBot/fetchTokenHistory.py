
import dontshare as d  # Assuming this module contains your API key
import constants as c
import time 
from rich.progress import track
import enlighten

import functions as f

def main():
    
    print(f"{c.GREEN}****************** Main Starting... ******************{c.RESET}")

    time_from, time_to =  f.get_time_range(d.INTERVAL_TIME_TYPE)

    TOKEN_ADDR  = d.TOKEN_ADDR
    period      = d.PERIOD
    
    cur_percent = f.fetch_token_history(TOKEN_ADDR)
    prev_percent = 0

    for n in track(range(10000), description="Processing..."):        

        prev_percent = n
        
        while True and prev_percent > cur_percent :

            cur_percent = f.fetch_token_history(TOKEN_ADDR)
            # print(cur_percent)

            if cur_percent - prev_percent > 0 :            
                break

            time.sleep(5)

        # time.sleep(0.001)

    # manager = enlighten.get_manager()
    # pbar = manager.counter(total=10000, desc='Progress...')

    # for i in range(1, 10001):

    #     pbar.update()
    #     prev_percent = i
        
    #     while True and prev_percent > cur_percent :

    #         cur_percent = f.fetch_token_history(TOKEN_ADDR)
    #         # print(cur_percent)

    #         if cur_percent - prev_percent > 0 :            
    #             break

    #         time.sleep(5)

    #     # print(i)
    #     # time.sleep(0.1)

    print(f"{c.GREEN}****************** Main End... ******************{c.RESET}")

    
if __name__ == "__main__":
    main()
