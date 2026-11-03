import asyncio, os
from urllib.parse import urlsplit
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BotCommand
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.core import User, UserSettings

router=Router()
COPY={
'en':('Your subscriptions. Your decision.','Open SubGuard','Track renewals, trials, cancellations and refund requests. SubGuard does not cancel services or guarantee refunds.','Reminders paused.','Reminders enabled. Open the app once to create your account.'),
'ru':('Ваши подписки. Ваше решение.','Открыть SubGuard','Следите за продлениями, пробными периодами, отменами и возвратами. SubGuard не отменяет услуги и не гарантирует возврат.','Напоминания отключены.','Напоминания включены. Откройте приложение для создания аккаунта.'),
'tr':('Abonelikleriniz. Karar sizin.','SubGuard’ı aç','Yenilemeleri, denemeleri, iptalleri ve iade taleplerini takip edin. SubGuard hizmetleri iptal etmez veya iadeyi garanti etmez.','Hatırlatmalar durduruldu.','Hatırlatmalar açıldı. Hesap oluşturmak için uygulamayı açın.')}

def words(message): return COPY.get((message.from_user.language_code or 'en')[:2],COPY['en'])

def keyboard(): return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text='SubGuard ↗',web_app=WebAppInfo(url=os.environ['MINI_APP_URL']))]])

@router.message(Command('start','app','help'))
async def start(message:Message):
    if message.chat.type!='private': return
    t=words(message)
    await message.answer(t[0]+'\n\n'+t[2],reply_markup=keyboard())

@router.message(Command('stop','reminders'))
async def reminders(message:Message):
    if message.chat.type!='private': return
    enabled=message.text.split()[0].split('@')[0]=='/reminders'
    async with SessionLocal() as db:
        prefs=await db.scalar(select(UserSettings).join(User).where(User.telegram_id==message.from_user.id))
        if prefs: prefs.notifications_enabled=enabled;await db.commit()
    await message.answer(words(message)[4 if enabled else 3])

async def main():
    token=os.environ.get('TELEGRAM_BOT_TOKEN')
    url=os.environ.get('MINI_APP_URL','')
    if not token or urlsplit(url).scheme!='https': raise RuntimeError('Configure TELEGRAM_BOT_TOKEN and HTTPS MINI_APP_URL')
    bot=Bot(token);dp=Dispatcher();dp.include_router(router)
    await bot.set_my_commands([BotCommand(command='start',description='Open SubGuard'),BotCommand(command='help',description='Help'),BotCommand(command='stop',description='Pause reminders'),BotCommand(command='reminders',description='Enable reminders')])
    await dp.start_polling(bot)

if __name__=='__main__': asyncio.run(main())
