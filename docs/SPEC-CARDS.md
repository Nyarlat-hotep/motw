# Spec: session awards, and hunter cards you make your own

Written 2026-10-09 for Jacob to review. **Nothing here is built.** It turns the brainstorm of that evening into two tracks of work:

- **Track J, session awards.** The Keeper ends the session, everyone gets an end-of-match screen, and hunters earn permanent badges that roast them. This is specified in full, because Jacob has decided how it should work.
- **Track L, card looks.** The ways a player makes their card their own: a personal mark, colors, frames, portrait treatments, what the card says, and marks it picks up with age. Specified more lightly; each chunk says what is still open.

Sizes are the same rough ones as in [WORKPLAN.md](WORKPLAN.md): **S** a few hours, **M** about a day, **L** two days or more. The rules in CLAUDE.md apply to all of it (one-file ES5 page, light and dark, 390px, no emoji, reduced motion respected, everything from other people checked and escaped).

## Decided, and assumed

Decided by Jacob on 2026-10-09:

1. Badges are **permanent collectibles**. They belong to the hunter, and the player chooses which ones to display.
2. **The Keeper ends the session**, and the awards fire for everyone at once, like the summary at the end of an online match.
3. The badges **roast people**.
4. Awards are **based on the rolls of the session** (plus harm, Luck and dying).

Assumed by me unless Jacob says otherwise. Each one is a real choice; strike any that are wrong.

| # | Assumption | Why | The other way |
|---|---|---|---|
| A1 | Only a hunter who is **shared with the table** can earn badges. A player who has not turned on "Show my hunter and my rolls to the table" sees the summary but is not in it. | The table can only count what it is sent, and one path is simpler and harder to get wrong. | Also work out personal badges on each player's own page. Twice the code, and two sources that can disagree. |
| A2 | A session **starts by itself**: at the first shared roll after the table has had no rolls for three hours. Nobody has to press Start. | A Start button will be forgotten, and then the night is not counted. | A Start button on the Keeper's desk. |
| A3 | If the Keeper forgets to end the session, **it can still be awarded later**. The table keeps the last five sessions that were never ended. | Forgetting is likely. It also means counting can go live before the awards screen exists. | An un-ended session is lost when the next one starts. |
| A4 | Rolls are counted **as rolled**. A miss rescued with Luck still counts as a miss (and earns Lucky Devil as well). | It is funnier, and Luck already has its own badge. | A rescued roll counts as the 12 it became. |
| A5 | **Five** badges at most are displayed on a card. The rest live in the collection. | The card has little room, and choosing is part of the fun. | Three, or as many as fit. |
| A6 | "Dealt the most damage" becomes **Heavy Hitter: the most Kick Some Ass rolls of 7 or more**. | The journal has never recorded harm dealt, only harm taken. | The Keeper hands it out by hand. |
| A7 | A few badges are **secret**: nobody sees their name or rule until someone at the table earns one. | Something to discover. | Everything listed from the start. |
| A8 | The Keeper has no hunter and earns nothing. If the Keeper's email also shares a hunter (Jacob testing), that hunter counts like any other. | | |
| A9 | The Keeper can **discard** a session instead of awarding it, for practice nights and tests. | Badges are permanent, so a test must not leave any. | |

---

# Track J: Session awards

## What the group gets

A night, as it would go:

1. People sit down, share their hunters, and play. Nothing new to press. The table quietly counts.
2. At the end the Keeper opens the Keeper's desk and presses **End the session**. They see what is about to be handed out, add up to three awards of their own, and confirm.
3. On every screen, the page gives way to **the tally**: a scoreboard of the night, then the awards, revealed one at a time with their roast, each with the scorched edge and a sound.
4. Each player ends on **their haul**: the badges their hunter just earned, and a button to pin them to the card.
5. A badge stays with that hunter for good. Earn it again and it counts up ("Punching Bag x3").
6. Someone who left early, or missed the night, finds the tally waiting the next time they open the journal.

## What a session is

- It starts at the first shared roll after three quiet hours (A2), or after the last session was ended.
- It ends when the Keeper presses End the session, or discards it.
- A session nobody ended stays on the Keeper's desk, with its date and roll count, and can be ended or discarded later. The table keeps five of these; the oldest falls off (A3).
- The table keeps the finished tallies of the **last 20 sessions**, so they can be reopened.

## What is counted, and by whom

Two sources, on purpose.

**The table counts rolls.** It already receives every shared roll and works out the total itself, so a page cannot post a roll that does not add up. For each hunter in the session it keeps: rolls, misses, 7 to 9s, 10+, natural doubles, the best and worst total, the longest run of misses and of 10+, and a count for each basic move. Three small additions to what a page sends with a roll:

- which hunter rolled (see "A hunter gets an id" below),
- which basic move it was, as one of the eight known ids (`kick`, `act`, `help`, `inv`, `manip`, `prot`, `read`, `magic`), or nothing for a playbook move,
- a follow-up when Luck is spent on that roll. Today the table is never told, so the feed still shows the miss. This fixes that as well.

**The page counts what only it knows.** Harm taken, the highest harm reached, Luck spent, whether the hunter levelled up, and whether they died. It counts these from the same changes that make lines in the session timeline, so a mis-click corrected within five seconds, or undone later, does not count. It sends the running numbers along with the hunter card, and the table keeps the latest. A player who has gone home by the end is still counted.

A hunter who dies mid-session keeps their numbers up to that point. The replacement hunter starts from zero and can earn badges of their own the same night.

## The badges

Names and lines are my first draft. **Jacob: these are yours to rewrite**, and the tone is your call (see "For Jacob" at the end). A "roll" is a shared roll during the session; totals include the modifier; "natural" means the dice alone.

### Feats

Everyone who does the thing gets the badge. At most one of each per session; earning it again in a later session counts up.

| Badge | Earned by | Line |
|---|---|---|
| Snake Eyes | Rolling a 1 and a 1 | Two ones. The dice looked at you and felt nothing. |
| Boxcars | Rolling a 6 and a 6 | Two sixes. Do not get used to it. |
| Cold Streak | Three misses in a row | Three misses running. Have you tried rolling better? |
| Hot Hand | Three 10+ in a row | Three in a row. Somebody check those dice. |
| Clean Sheet | Six or more rolls and not one miss | Not a single miss. Suspicious. |
| Overachiever | A total of 12 or more without Luck | Twelve. Nobody likes a showoff. |
| Lucky Devil | Spending Luck to change a roll | Bought your way out. The bill comes later. |
| Running on Fumes | Ending the session with no Luck left | Luck: none. From here on it is all you. |
| Death's Door | Reaching 7 harm and living to the end of the session | One more scratch and we would be reading your will. |
| Not a Scratch | Six or more rolls and no harm taken | Everyone else bled. You watched. |
| Older and Wiser | Levelling up | Levelled up. Mostly by failing. |
| Benchwarmer | One or two rolls on a night when the table rolled 20 or more | Were you even here? |
| Buried in the Dry | Dying | Died as they lived: rolling badly. |

### Superlatives

One winner a session. A tie is shared. Each needs at least two hunters in the session and its own minimum, so nobody wins "most misses" with one miss.

| Badge | Goes to | At least | Line |
|---|---|---|---|
| Dead Weight | The most misses | 3 | Most misses at the table. At least the XP is good. |
| Golden Arm | The most 10+ | 3 | Most full successes. Enjoy it. It will not last. |
| Punching Bag | The most harm taken | 3 harm | Took the most harm. Have you considered ducking? |
| Heavy Hitter | The most Kick Some Ass rolls of 7 or more (A6) | 2 | Landed the most hits. Violence was the answer. |
| Spotlight Hog | The most rolls | 8 | Rolled more than anyone. Let someone else talk. |
| Nosy | The most Investigate a Mystery and Read a Bad Situation rolls | 3 | Asked the most questions. Trusted none of the answers. |
| Human Shield | The most Protect Someone rolls | 2 | Stood in front of everyone else's bad decisions. |
| Silver Tongue | The most Manipulate Someone rolls of 7 or more | 2 | Talked their way through it. Again. |
| Playing with Fire | The most Use Magic rolls | 2 | Used the most magic. Nothing bad ever comes of that. |
| Wingman | The most Help Out rolls | 2 | Helped the most. Somebody had to. |
| Rock Bottom | The lowest single total of the night | | Lowest roll of the night. The floor thanks you for visiting. |
| Peak | The highest single total of the night | | Highest roll of the night. We get it. |

### The Keeper's picks

The Keeper may hand out each of these once a session, to whoever they like. All three are optional.

| Badge | Line |
|---|---|
| Carried the Night | The Keeper says you were the reason anyone lived. |
| Worst Idea of the Night | The Keeper would like a word about your plan. |
| Line of the Night | Said the thing everyone will be quoting. |

### Secret badges (A7)

Shown as "???" in everyone's collection until someone at the table earns one. From then on the whole table can see its name and rule.

| Badge | Earned by | Line |
|---|---|---|
| The Long Dry | Six or more rolls and not one 10+ | A whole session without a 10. The campaign is named after you now. |
| Dust to Dust | Dying with three or more Luck unspent | Died with Luck in the bank. You cannot take it with you. |
| Same Again | The same two dice three times in a row | The dice are stuck. So are you. |
| Twins | Four natural doubles in one session | Seeing double. Four times. |
| Jack of All Trades | Rolling all eight basic moves in one session | Tried everything. Mastered nothing. |

That is 33 badges. Adding one later is a new row in one table and, for most, one line of rule.

### What a badge looks like

A stamped tin token: a ring, an icon from the sigil library in the middle, and a count when it has been earned more than once. The ring's color says which kind it is (feat, superlative, Keeper's pick, secret). No new artwork is needed; the sigil library has over 250 icons and its credits are already in the page. The icon for each badge is picked when it is built. **Jacob:** if you would rather draw some, the same tracing script that made your sigils will take them.

## Ending the session (the Keeper)

On the Keeper's desk, above the handouts:

- **While a session is running:** "Tonight: 4 hunters, 61 rolls, since 7:02 pm" and the button **End the session**.
- **Pressing it opens a preview**, seen only by the Keeper: the scoreboard, and every badge about to be awarded with who gets it.
  - **Keeper's picks:** for each of the three, choose a hunter or leave it out.
  - **Discard this session instead** (A9), with its own confirmation.
  - **Award it:** one more "Are you sure? This cannot be taken back" and it fires.
- **Sessions that were never ended** are listed below with the same two choices.
- Only the Keeper's connection can do any of this. The table refuses it from anyone else, as it does for handouts.

There is no "take it back" in the first version. The preview and the confirmation are the guard, and Discard covers practice nights.

## The tally (everyone's screen)

A dialog over the page, the same on every screen, in three parts. A **Skip** button jumps to the end at any time.

1. **The scoreboard.** One row a hunter, with portrait, name and playbook: rolls, 10+, 7 to 9, misses, harm taken, Luck spent, best and worst roll. The table's totals underneath. On a phone each hunter is a small card instead of a row.
2. **The awards.** One at a time, a couple of seconds each: the token lands, the name, who earned it, the roast line. The scorched edge burns for each, and with sound on there is a hit for each. Superlatives first, feats next, secret badges and the Keeper's picks last. A newly discovered secret badge says so.
3. **Your haul.** The badges your own hunter earned tonight, with **Pin to my card** on each, then **Copy for chat** (the whole tally as plain text for Discord) and **Finish my session**, which opens the end-of-session ritual that already exists.

Details:

- With reduced motion, or with Big moments switched off, there is no reveal: the awards are a plain list.
- The dialog can be closed and reopened. The Party tab gets a **Last session** button, and a list of the last 20.
- A player who was not connected when it fired gets a dot on the Party tab, as a new handout does, and the tally opens from there. Their badges are added when their page next connects.
- The Keeper sees the same dialog, without a haul.

## Badges on the hunter

- **My sheet gets a Badges card.** The collection as a grid of tokens: earned ones in color with their count; unearned ones greyed with their name and how to earn them; secret ones as "???". Tapping one shows its line, how many times, and the first and latest date.
- **Pinning.** Up to five (A5), in the order the player picks. Pin and unpin from the collection or from the haul.
- **On the card at the table.** The Party tab's hunter card shows the pinned tokens in a row. Tapping one shows its name, line and count. The Keeper's overview shows them too.
- **On the card picture.** The 1200 x 630 picture for chat gets the same row.
- **In the roll feed.** Not in the first version; see "Not in the first version".
- **They stay with the hunter.** Switching hunters switches badges. A dead or retired hunter keeps theirs on the shelf.
- **Backups carry them**, because they are part of the hunter. If a player restores an older backup, the table hands back anything from the last 20 sessions that is missing.

## How it is built

For whoever builds it. Skip this part if you only want to know what it does.

**A hunter gets an id.** `S.sheet.hid`, a short random id made once and kept for the life of the hunter, including on the bench. Awards are addressed to a player and a hunter, so they land on the right one even if the player has switched since.

**In the save** (all in `defaults()`, all cleaned on load like the bench is):

- `sheet.hid`: the id above.
- `sheet.badges`: `{ <badge id>: { n: times earned, first: date, last: date, s: [session numbers] } }`.
- `sheet.pins`: up to five badge ids.
- `S.night`: `{ n: session number, hid, harm, peak, luck, lvl, died }`, the page's running numbers for the current session. Started afresh when the table announces a new session number or the hunter changes.
- `S.synseen`: the newest tally this player has looked at (drives the dot).

**Messages.** New or changed, on the WebSocket that exists:

| Message | From | What |
|---|---|---|
| `roll` (changed) | player | also carries `hid` and `mv` (a basic move id or empty) |
| `roll-luck` | player | "my roll number n was rescued with Luck" |
| `card` (changed) | player | also carries `hid`, `pins`, `night` |
| `sess` | table | the current session's number and start, in the first snapshot and whenever it changes |
| `sess-preview` | Keeper | "show me what ending session n would award"; answered only to the Keeper |
| `sess-end` | Keeper | session n, the Keeper's picks, or discard |
| `synopsis` | table | the finished tally, sent to everyone; also fetched by number, and the latest number is in the first snapshot |

**In the table (the Durable Object).** Three new SQLite tables: the sessions (number, start, last roll, state), the tally (one row for each hunter in each session: the counters, the run in progress, the page's numbers, and the name, playbook and small photo as they were), and the finished tallies (the last 20, each a few kilobytes of JSON). A roll now writes two rows where it wrote one. At a hundred rolls a night that is nowhere near the free plan's daily limits.

**The rules live in one module**, `worker/awards.mjs`: a list of badges (id, kind, minimum, the function that reads a tally) and one function that takes a session's tallies and returns who gets what. It has no storage and no network in it, so it is tested in plain Node with made-up nights, the way `tests/t22.js` tests the cleaning. The page has the same list of ids, names, lines and icons for drawing.

**Checking what arrives.** As everywhere else at the table:

- The Worker cleans every new field: `hid` by pattern, `mv` against the eight ids, `pins` against the badge ids and cut to five, each number in `night` clamped to a sane range.
- The page checks the tally it is sent the same way before drawing it: known badge ids only, every string cut and escaped.
- The Keeper's picks are ids from the list, not free text.

**What it trusts.** The dice are the player's own, as they always were: the table cannot know a roll was fair. The page's numbers for harm and Luck are also the player's word. And a player who edits their own save could pin a badge they never earned. Among friends that is fine, and it is written here so nobody is surprised. The tally itself is the table's, and a player cannot change what it awarded.

## Not in the first version

- Taking back a session that was awarded.
- Awards for a player who is not sharing (A1).
- A badge beside the roller's name in the roll feed.
- An all-time board on the Party tab ("most Dead Weights ever"). The data will be there; it is a screen to add later.
- A picture of the tally for chat, like the hunter card picture. Copy for chat comes first.
- The Keeper answering the end-of-session questions once for the whole table, so everyone's XP is marked together. It would fit naturally after the tally and is worth doing; it is its own chunk (J8).

## Chunks

| Chunk | What | Size | Done when |
|---|---|---|---|
| J1 | **Counting.** Hunter ids; `hid`, `mv` and `roll-luck` on rolls; the page's `night` numbers; sessions and tallies in the table. No screen. | M | Two test players roll a scripted night against the local Worker and the stored tally matches by hand, including a rescued miss, an undone harm click, a hunter who dies and is replaced, and a three-hour gap starting a new session. Old pages and old saves still work. |
| J2 | **The rules.** `worker/awards.mjs` with all 33 badges, ties, minimums and secrets. | M | A plain-Node test feeds it a dozen made-up nights (a tie, a lone hunter, nobody qualifying, every secret) and each gives exactly the expected awards. |
| J3 | **Ending the session.** The desk's session line, the preview, the Keeper's picks, discard, and the un-ended list. | M | Only the Keeper can preview or end; a player's attempt is refused; a discarded session awards nothing; a session ended the next day awards correctly. |
| J4 | **The tally.** The dialog, the token drawing, the reveal, the haul, Copy for chat, reopening, and the dot for someone who missed it. | M to L | Three browsers see the same tally within two seconds; Skip, reduced motion and Big moments off all give the plain list; it fits a phone; a player who connects afterwards gets the dot and the badges. |
| J5 | **Badges on the hunter.** The Badges card, pinning, tokens on the Party card and the Keeper's overview, restore from the table. | M | Badges survive a reload, a backup and a hunter switch; five pins at most; a hostile `pins` list from another player draws nothing it should not. |
| J6 | **Badges on the card picture.** | S | The picture shows the pinned row and nothing spills, checked the way `tests/t14.js` checks the rest. |
| J7 | **Words and icons pass.** Jacob's rewrite of the names and lines, and the final icon for each badge. | S | Jacob has read them all. |
| J8 | *(later)* The Keeper answers the end-of-session questions for the table. | M | |

**J1 is worth shipping on its own before Wednesday 2026-10-14.** It has no screen and changes nothing a player sees, but it means the first real session is counted. Because an un-ended session is kept (A3), that night can be awarded as soon as J2 to J4 exist, even if that is days later.

---

# Track L: Card looks

How a player makes the card their own. One rule runs through all of it: **a look is a set of choices from lists the page already knows** (a sigil key, an ink, a frame id), never free colors-as-text or free CSS, and both the Worker and the page check every value. It is the rule dice codes already follow.

A card's look is saved with the hunter as `sheet.style` and sent with the card. A page that does not know a value draws the plain card.

| Chunk | What the player gets | Size | Notes and open questions |
|---|---|---|---|
| L1 | **A personal mark.** Pick any sigil as your emblem. It sits on your card like a seal, beside your name in the seat list and the roll feed, and on the card picture. | S to M | Reuses the sigil picker from the dice maker. The cheapest change with the widest reach, because the mark shows up every time you roll. |
| L2 | **Your colors.** Your ink colors your card on everyone's screen, or **Match my dice** takes the trim from your dice: body color, pip color and finish. | S to M | The dice already travel with the card. Every pairing has to stay readable, so colors go on the trim and the name, never under body text; the 4.5:1 check in `tests/t18.js` is extended to cover it. |
| L3 | **Frames.** Wanted poster, agency dossier, tarot card, dog tag, riveted scrap plate, and the plain journal page there is today. Each playbook starts on one that suits it. | L | **Jacob: artwork or code?** Drawn in code (borders, stamps, corner pieces in SVG) is a couple of days and will look clean but simple. Your own artwork would look better and is the place The Long Dry could show up without retheming the journal. I would build two in code first to prove the frame system, then take art. |
| L4 | **Portrait treatments.** Shape: rectangle, oval cameo, polaroid, torn photo. Finish: as it is, sepia, or a two-color poster look. | S to M | The live card uses CSS; the picture redraws on its canvas. The photo itself is never changed. |
| L5 | **What the card says.** An epithet under the name ("the Dust Saint"; the name generator already makes them). A featured weapon, move and bond instead of the long lists. A **back side**: flip the card for the look, the history and the whole badge collection. | M | The back is where a full badge collection is seen by other players, so it pairs well with J5. |
| L6 | **Wear and tear.** Marks the card picks up without anyone choosing: a star for each level, scorched corners at 2 Luck or less, cracks while Unstable, a tally of monsters put down. Dead and retired hunters keep their card, stamped with how it ended, on a memorial wall on the Party tab. | M | The monster tally needs a "put down by" tick on a bestiary entry, which does not exist yet. The memorial wall needs the table to keep the cards of hunters who have ended, which it does not do today. |
| L7 | **Card codes.** Copy your look as a short code, like a dice code, so a friend can take it. | S | Only worth doing once L1 to L4 give a look enough parts to be worth sharing. |
| L8 | **Live reactions.** Your card flinches on everyone's Party tab when you take harm, and glows when you level up. | S | Respects reduced motion and the Big moments switch. |

Where the choices live: a **Card** section on My sheet, next to Save hunter card, with a live preview. It should stay small. The dice maker is already the big editor, and a second one with forty switches would be opened once.

---

# Proposed order

1. **J1** (counting), so Wednesday's session is recorded.
2. **J2, J3, J4, J5** (the rules, ending, the tally, badges on the hunter). This is the feature Jacob asked for; it is not finished until all four are in.
3. **L1** and **L2** (the mark and the colors). Small, and they make every card different straight away.
4. **J6, J7** (the picture, and the words pass).
5. **L5** (epithet, featured picks, the back), then **L4**, **L8**.
6. **L3** (frames), once Jacob has decided between artwork and code.
7. **L6, L7, J8** as taste decides.

# For Jacob

To review, in rough order of how much they change the build:

1. **The assumptions table at the top** (A1 to A9). A1, A2 and A4 matter most.
2. **The badge list.** Too many, too few, any that are missing? Any rule that is wrong for how your group plays?
3. **The roast lines.** They are a first draft in a dry voice with no swearing. Tell me how rough your table likes it, or rewrite them; they are one table in the page.
4. **Five pinned badges** on a card: right number?
5. **Frames (L3):** your artwork, or drawn in code?
6. **The order above.** In particular whether the mark and colors (L1, L2) should jump ahead of the awards.
