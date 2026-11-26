# Spell Quests

A blocky spelling adventure for Years 4, 5 and 6, built for iPads.

- **Year 4 – Stone Age Lands** (forest and plains)
- **Year 5 – Outback Expedition** (Australian outback)
- **Year 6 – Volcano Depths** (volcanoes, caves and gems)

Each world has **18 zones** (the Cambridge Primary English spelling lists). Each zone has four steps:

1. **📖 Learn** – hear the word, see the spelling pattern highlighted, read its meaning and an example sentence, then Look–Say–Cover–Write–Check.
2. **⛏️ Practise** – mini-games that earn gems: Block Builder, Missing Pieces, Spot the Glitch, Crafting Table and Speed Run.
3. **🚪 Challenge Gate** – dictation of 10 words. Earn up to 3 stars, gems, and unlock the next zone.
4. **🔍 Check** – a few days later, correct words come back. Spell them again and they go into the **📓 spelling notebook**, which can be printed and copied into a real book.

Also on every map:

- **⭐ Expedition** – the statutory word lists.
- **🏕️ Base Camp** – the 200 high-frequency words.
- **A themed shop** where gems buy avatar gear: furs, tools and more.

Teachers get a **dashboard** with:

- class codes
- a zone-by-zone progress grid
- the most commonly misspelt words
- a spreadsheet download

> The word lists come from Cambridge University Press and Twinkl resources. They are for use within the school only, so keep this repository and the hosted game private to the school.

## How it's built

- Plain HTML, CSS and JavaScript with no build step. Open `index.html` through any static web host.
- [three.js](https://threejs.org) draws the 3D blocky avatars. It's stored in `vendor/`.
- [Supabase](https://supabase.com) handles sign-in (Microsoft or email link) and saves progress. The database setup is in `supabase/migrations/`.
- The iPad's built-in British English voice reads the words aloud.
- Spelling boxes switch off autocorrect. Apple Pencil handwriting (Scribble) works in every answer box.

| File | What it does |
|---|---|
| `js/data/lists.js` | All word lists (generated from the PDFs) |
| `js/data/details.js` | Meanings, example sentences and emoji for each word (**teachers: please check these**) |
| `js/worlds.js` | World themes, zone names and spelling-pattern rules |
| `js/avatar.js` | The 3D avatar and the shop items |
| `js/screens/` | All the screens (start, map, play, teacher) |
| `js/config.js` | Settings: Check delay, Challenge size, guest mode |

## Try it on your computer

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Add `?dev` to the address (`http://localhost:8000/?dev`) to make Checks available straight away for testing.

## Setup still to do

1. **Host the game** on Netlify, Vercel or Cloudflare Pages. Connect this GitHub repository; no build command is needed.
2. In **Supabase → Authentication → URL Configuration**, set the **Site URL** to the hosted address and add it to **Redirect URLs**.
3. **Microsoft sign-in:** your IT admin registers an app in Microsoft Entra with this redirect URI:
   `https://yhtmhtmvcvvjxahbvjav.supabase.co/auth/v1/callback`
   Then enter the client ID, secret and tenant URL in **Supabase → Authentication → Sign In / Providers → Azure**.
4. **Add teachers:** in **Supabase → Table Editor → `teacher_emails`**, add each teacher's school email in lower case. Those accounts become teachers automatically.
