import config as d
from sub import constants as c
from sub import functions as f

import asyncio
import time

from telegram import Bot

async def main():
    
    print(f"{c.GREEN}****************** Alert Bot Starting... ******************{c.RESET}")


    bot_token = d.BOT_TOKEN
    chat_id = d.CHAT_ID

    # bot = Bot(token=bot_token)

    count = 0

    while True:

        token_info = f.find_AlertingTokens()
        
        print(len(token_info))

        if len(token_info) :
            count = count + 1
            print(f'{c.GREEN} ========== Alerting token info({count}) : [{token_info['symbol']}] ========== {c.RESET}')
            await f.send_telegram_alert(bot_token, chat_id, token_info)
        else:
            print(f"{c.RED}****************** Nothing to find token... ******************{c.RESET}")

        time.sleep(30)
    
    
    # Path to the picture you want to send
    # picture_path = './image/3.jpg'
    
    # f.send_telegram_message(text)
    # f.send_telegram_photo(picture_path)

    print(f"{c.GREEN}****************** Alert Bot End... ******************{c.RESET}")

if __name__ == "__main__":
    asyncio.run(main())