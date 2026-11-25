import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import type { Update } from 'grammy/types';
import type { VerifyProfilePhone } from '../../application/use-cases/user/VerifyProfilePhone';
import { UnavailableError } from '../../domain/errors/UnavailableError';

const shareNumber = new Keyboard()
  .requestContact('Raqamimni yuborish')
  .primary()
  .resized()
  .oneTime();

export class TelegramPhoneBot {
  private readonly bot: Bot;

  constructor(
    readonly username: string,
    readonly webhookSecret: string,
    token: string,
  ) {
    this.bot = new Bot(token, { client: { timeoutSeconds: 5 } });
  }

  static fromConfig(config: ConfigService) {
    const value = (key: string) => config.get<string>(key, '').trim();
    const token = value('TELEGRAM_BOT_TOKEN') || value('TG_BOT_API_KEY');
    const username = value('TELEGRAM_BOT_USERNAME');
    const secret = value('TELEGRAM_WEBHOOK_SECRET');
    return token && username && secret
      ? new TelegramPhoneBot(username, secret, token)
      : null;
  }

  createHandler(verification: VerifyProfilePhone) {
    const privateChat = this.bot
      .chatType('private')
      .filter(({ chat, from }) => chat.id === from?.id);

    privateChat.command('start', async (ctx) => {
      const startToken = ctx.match.trim();
      if (!startToken) {
        await ctx.reply('Tasdiqlashni LexiMind profilingizdan boshlang.', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
      if (
        !(await verification.linkTelegram(
          startToken,
          ctx.chat.id,
          ctx.update.update_id,
        ))
      ) {
        await ctx.reply('LexiMind’dan yangi tasdiqlash havolasini oling.', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
      await ctx.reply('Telefon raqamingizni ulashing.', {
        reply_markup: shareNumber,
      });
    });

    privateChat.on('message:contact', async (ctx) => {
      const contact = ctx.message.contact;
      const code =
        contact.user_id === ctx.from.id
          ? await verification.codeForContact(
              contact.phone_number,
              ctx.chat.id,
              ctx.update.update_id,
            )
          : null;
      if (!code) {
        await ctx.reply(
          'LexiMind’dagi raqamga mos Telegram kontaktini yuboring.',
          { reply_markup: shareNumber },
        );
        return;
      }
      await ctx.reply(
        'LexiMind kodi: <code>' + code + '</code>\nKodni hech kimga bermang.',
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .copyText('Kodni nusxalash', code)
            .success(),
        },
      );
    });

    return async (update: Update) => {
      try {
        await this.bot.init();
        await this.bot.handleUpdate(update);
      } catch {
        // grammY errors can contain request payloads or API credentials.
        throw new UnavailableError('Telegram could not process the update.');
      }
    };
  }
}
