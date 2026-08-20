from typing import Final
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes


OKEN: Final = "8685228535:AAFVAC9cgj5j7KsVmsDm6HZGsEdqGHEDgmk"
BOT_USERNAME: Final = "@Engagement_RSVP_BOT"


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
  
  await update.message.reply_text('Hello! Thanks for chatting with me! I am a banana!')
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):

  await update.message.reply_text('I am a banana!')
async def custom_command(update: Update, context: ContextTypes.DEFAULT_TYPE):

  await update.message.reply_text('this is a custom command!')




  