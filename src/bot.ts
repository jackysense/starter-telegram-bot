import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { chunk } from "lodash";
import express from "express";
import { applyTextEffect, Variant } from "./textEffects";

import type { Variant as TextEffectVariant } from "./textEffects";

// Create a bot using the Telegram token
const bot = new Bot(
  process.env.TELEGRAM_TOKEN || "6508915002:AAHsR1aHA8PYOmGt8Ijy6am7bozWSwLkOH8"
);

// Handle the /yo command to greet the user

const web_link1 = "https://telegram-web-app-three.vercel.app/";
const web_link = "https://example.hanko.io/";
const web_link2 = "https://webauthn.io/";

// bot.command("aa", (ctx) => {
//   ctx.reply(`Welcome ${ctx.from?.username}`, {
//     reply_markup: {
//       keyboard: [[{ text: "web app", web_app: { url: web_link } }]],
//     },
//   });
// });
// bot.command("key", (ctx) => {
//   ctx.reply(`Welcome ${ctx.from?.username}`, {
//     reply_markup: {
//       keyboard: [[{ text: "passkeys", web_app: { url: web_link1 } }]],
//     },
//   });
// });
// bot.command("key2", (ctx) => {
//   ctx.reply(`Welcome ${ctx.from?.username}`, {
//     reply_markup: {
//       keyboard: [[{ text: "auth", web_app: { url: web_link1 } }]],
//     },
//   });
// });

// bot.command("basic", (ctx) => {
//   ctx.reply(`Welcome ${ctx.from?.username}`, {
//     reply_markup: {
//       keyboard: [
//         [
//           {
//             text: "webauthn",
//             web_app: {
//               url: "https://webauthn.passwordless.id/demos/basic.html",
//             },
//           },
//         ],
//       ],
//     },
//   });
// });

bot.command("start", (ctx) => {
  ctx.reply(`Welcome ${ctx.from?.username}`, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "browser-support",
            web_app: {
              url: "https://webauthn.me/browser-support",
            },
          },
          {
            text: "webauthn",
            web_app: {
              url: "https://webauthn.passwordless.id/demos/basic.html",
            },
          },
        ],
        [
          {
            text: "passkeys",
            web_app: {
              url: "https://example.hanko.io/",
            },
          },
          {
            text: "Has PublicKeyCredential",
            web_app: {
              url: "https://telegram-web-app-three.vercel.app/",
            },
          },
        ],
        [
          {
            text: "uniswap",
            web_app: {
              url: "https://app.uniswap.org/#/swap",
            },
          },
          {
            text: "AAKey",
            web_app: {
              url: "https://docs.zerodev.app/create-wallets/passkey",
            },
          },
        ],
      ],
    },
  });
});

// Handle the /effect command to apply text effects using an inline keyboard
type Effect = { code: TextEffectVariant; label: string };
const allEffects: Effect[] = [
  {
    code: "w",
    label: "Monospace",
  },
  {
    code: "b",
    label: "Bold",
  },
  {
    code: "i",
    label: "Italic",
  },
  {
    code: "d",
    label: "Doublestruck",
  },
  {
    code: "o",
    label: "Circled",
  },
  {
    code: "q",
    label: "Squared",
  },
];

const effectCallbackCodeAccessor = (effectCode: TextEffectVariant) =>
  `effect-${effectCode}`;

const effectsKeyboardAccessor = (effectCodes: string[]) => {
  const effectsAccessor = (effectCodes: string[]) =>
    effectCodes.map((code) =>
      allEffects.find((effect) => effect.code === code)
    );
  const effects = effectsAccessor(effectCodes);

  const keyboard = new InlineKeyboard();
  const chunkedEffects = chunk(effects, 3);
  for (const effectsChunk of chunkedEffects) {
    for (const effect of effectsChunk) {
      effect &&
        keyboard.text(effect.label, effectCallbackCodeAccessor(effect.code));
    }
    keyboard.row();
  }

  return keyboard;
};

const textEffectResponseAccessor = (
  originalText: string,
  modifiedText?: string
) =>
  `Original: ${originalText}` +
  (modifiedText ? `\nModified: ${modifiedText}` : "");

const parseTextEffectResponse = (
  response: string
): {
  originalText: string;
  modifiedText?: string;
} => {
  const originalText = (response.match(/Original: (.*)/) as any)
    ? (response.match(/Original: (.*)/) as any)[1]
    : "";
  const modifiedTextMatch = response.match(/Modified: (.*)/);

  let modifiedText;
  if (modifiedTextMatch) modifiedText = modifiedTextMatch[1];

  if (!modifiedTextMatch) return { originalText };
  else return { originalText, modifiedText };
};

bot.command("effect", (ctx) =>
  ctx.reply(textEffectResponseAccessor(ctx.match), {
    reply_markup: effectsKeyboardAccessor(
      allEffects.map((effect) => effect.code)
    ),
  })
);

// Handle inline queries
const queryRegEx = /effect (monospace|bold|italic) (.*)/;
bot.inlineQuery(queryRegEx, async (ctx) => {
  const fullQuery = ctx.inlineQuery.query;
  const fullQueryMatch = fullQuery.match(queryRegEx);
  if (!fullQueryMatch) return;

  const effectLabel = fullQueryMatch[1];
  const originalText = fullQueryMatch[2];

  const effectCode = allEffects.find(
    (effect) => effect.label.toLowerCase() === effectLabel.toLowerCase()
  )?.code;
  const modifiedText = applyTextEffect(originalText, effectCode as Variant);

  await ctx.answerInlineQuery(
    [
      {
        type: "article",
        id: "text-effect",
        title: "Text Effects",
        input_message_content: {
          message_text: `Original: ${originalText}
Modified: ${modifiedText}`,
          parse_mode: "HTML",
        },
        reply_markup: new InlineKeyboard().switchInline("Share", fullQuery),
        url: "http://t.me/EludaDevSmarterBot",
        description: "Create stylish Unicode text, all within Telegram.",
      },
    ],
    { cache_time: 30 * 24 * 3600 } // one month in seconds
  );
});

// Return empty result list for other queries.
bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));

// Handle text effects from the effect keyboard
for (const effect of allEffects) {
  const allEffectCodes = allEffects.map((effect) => effect.code);

  bot.callbackQuery(effectCallbackCodeAccessor(effect.code), async (ctx) => {
    const { originalText } = parseTextEffectResponse(ctx.msg?.text || "");
    const modifiedText = applyTextEffect(originalText, effect.code);

    await ctx.editMessageText(
      textEffectResponseAccessor(originalText, modifiedText),
      {
        reply_markup: effectsKeyboardAccessor(
          allEffectCodes.filter((code) => code !== effect.code)
        ),
      }
    );
  });
}

// Handle the /about command
const aboutUrlKeyboard = new InlineKeyboard().url(
  "Host your own bot for free.",
  "https://cyclic.sh/"
);

// Suggest commands in the menu
bot.api.setMyCommands([
  { command: "start", description: "start by the bot" },
  // { command: "key", description: "passkeys demo by the bot" },
  // { command: "key2", description: "auth demo by the bot" },
  // { command: "basic", description: "basic demo by the bot" },
  // { command: "supoort", description: "supoort demo by the bot" },

  // {
  //   command: "effect",
  //   description: "Apply text effects on the text. (usage: /effect [text])",
  // },
]);

// Handle all other messages and the /start command
const introductionMessage = `Hello! I'm a Telegram bot.
I'm powered by Cyclic, the next-generation serverless computing platform.

<b>Commands</b>
/start - web app test
`;
// /key - passkeys demo
// /effect [text] - Show a keyboard to apply text effects to [text]
const replyWithIntro = (ctx: any) =>
  ctx.reply(introductionMessage, {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  });

bot.command("start", replyWithIntro);
bot.on("message", replyWithIntro);

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
