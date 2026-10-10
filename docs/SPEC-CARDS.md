# Spec: session awards, and hunter cards you make your own

Written 2026-10-09. **Revised 2026-10-10 after Jacob's first answers**: he likes the badges, wants them deeper and their icons to mean something, wants textures on them, and wants the hunter card to be customizable "at the level of someone's Steam page", with frames either drawn in code or uploaded as the player's own artwork. The list of badges, the token drawing and the round portrait's crop are built; everything else here is still to build.

- **Track J, session awards.** The Keeper ends the session, everyone gets an end-of-match screen, and hunters earn permanent badges that roast them. Specified in full.
- **Track L, the hunter's page.** Each hunter gets a page of their own that the player lays out: a frame, a background, colors, a personal mark, a portrait treatment and a set of showcases, with their own uploaded artwork where they want it. Rewritten on 2026-10-10; it replaces the lighter "card looks" list.

Sizes are the same rough ones as in [WORKPLAN.md](WORKPLAN.md): **S** a few hours, **M** about a day, **L** two days or more. The rules in CLAUDE.md apply to all of it (one-file ES5 page, light and dark, 390px, no emoji, reduced motion respected, everything from other people checked and escaped).

## Decided, and assumed

Decided by Jacob on 2026-10-09:

1. Badges are **permanent collectibles**. They belong to the hunter, and the player chooses which ones to display.
2. **The Keeper ends the session**, and the awards fire for everyone at once, like the summary at the end of an online match.
3. The badges **roast people**.
4. Awards are **based on the rolls of the session** (plus harm, Luck and dying).

Decided by Jacob on 2026-10-10:

5. The badge system should be **in depth**: more badges, and something to work towards once you have one. (My reading: the bigger list and the ranks below. He has seen the 63 on a sheet.)
6. **Every icon should make sense for its badge.** About a hundred icons were added to the sigil library for this.
7. Badges should be **textured** to fit the journal.
8. The card: **full customization, Steam-page level**. Frames can be chosen from ones drawn in code **or uploaded as your own artwork**.
9. The group plays by **the standard rules**, so no move is renamed for a badge.

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
2. At the end the Keeper opens the Keeper's desk and presses **End the session**. They see what is about to be handed out, add up to five awards of their own, and confirm.
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
- a follow-up when Luck is spent on that roll. Today the table is never told, so the feed still shows the miss. This fixes that as well,
- how much harm the hunter was carrying when they rolled (for Clutch).

**The table keeps every roll of the session, not just running totals**: the dice, the modifier, the move, who and when. A night is a few hundred rows at most. This is what lets a badge be added or re-ruled later and still be worked out for a night that has already been played, and it is what makes streaks, "your very next roll", the first and last roll of the night and table-wide badges possible.

**The page counts what only it knows.** Harm taken, the highest harm reached, the biggest single hit, Luck spent and Luck left, whether the hunter levelled up, whether they are Unstable, and whether they died. It counts these from the same changes that make lines in the session timeline, so a mis-click corrected within five seconds, or undone later, does not count. It sends the running numbers along with the hunter card, and the table keeps the latest. A player who has gone home by the end is still counted.

A hunter who dies mid-session keeps their numbers up to that point. The replacement hunter starts from zero and can earn badges of their own the same night.

## The badges

There are 63, in five kinds. The list itself lives in the page (`BADGES` in `index.html`: an id, a kind, a name, an icon, the rule in words, and the line); the tables below were made from it on 2026-10-10. Names and lines are my drafts in a dry voice with no swearing. **Jacob: they are yours to rewrite.** A "roll" is a shared roll during the session; totals include the modifier; "the dice alone" and "natural" mean the two dice before anything is added.

### Feats (26)

Everyone who does the thing gets the badge. At most one of each a session; earning it again in a later session counts up. A tin bottle cap.

| Badge | Earned by | Line | Icon |
|---|---|---|---|
| Snake Eyes | Roll a 1 and a 1 | Two ones. The dice looked at you and felt nothing. | One pip |
| Boxcars | Roll a 6 and a 6 | Two sixes. Do not get used to it. | Six pips |
| Cold Streak | Miss three rolls in a row | Three misses running. Have you tried rolling better? | Snowflake |
| Hot Hand | Roll 10 or more three times in a row | Three in a row. Somebody check those dice. | Burning fist |
| Clean Sheet | Six or more rolls and not one miss | Not a single miss. Suspicious. | Soap |
| Overachiever | A total of 12 or more without spending Luck | Twelve. Nobody likes a showoff. | Graduate cap |
| Lucky Devil | Spend Luck to change a roll | Bought your way out. The bill comes later. | Laughing imp |
| Running on Fumes | End the session with no Luck left | Luck: none. From here on it is all you. | Jerrycan |
| Death's Door | Reach 7 harm and live to the end of the session | One more scratch and we would be reading your will. | Doorway |
| Not a Scratch | Six or more rolls and no harm taken | Everyone else bled. You watched. | Dodging |
| Older and Wiser | Level up | Levelled up. Mostly by failing. | Owl |
| Benchwarmer | One or two rolls on a night when the table rolled 20 or more | Were you even here? | Park bench |
| Buried in the Dry | Die | Died as they lived: rolling badly. | Tombstone |
| Fence Sitter | Five results of 7 to 9 in one session | Five mixed successes. Pick a side. | Scales |
| Comeback | Roll 10 or more straight after two misses in a row | Down two, then that. Where was it earlier? | Boomerang |
| Glass Jaw | Take 3 or more harm in one hit | One hit did all that. Drink some milk. | Jawbone |
| Rainy Day Fund | Miss three times and spend no Luck, with 4 or more left | Three misses and no Luck spent. Saving it for what? | Piggy bank |
| Trigger Happy | Five or more Kick Some Ass rolls in one session | Five fights in one night. Have you tried talking? | Revolver |
| Pacifist | Eight or more rolls and not one Kick Some Ass | Not one punch thrown. The monsters send their thanks. | Dove |
| One-Trick Pony | Six or more rolls, and two in three of them the same basic move | Same move all night. It is a good move, to be fair. | Horse |
| Walking Wounded | End the session Unstable | Went home leaking. See a doctor. Or a mechanic. | Arm in a sling |
| Lucky Seven | A total of exactly 7, three times in one session | Seven, three times. Just enough, every time. | Clover |
| Clutch | Roll 10 or more while on 6 harm or more | Bleeding out and still nailed it. Showoff. | Heartbeat |
| Natural Disaster | The dice alone come to 4 or less, three times in one session | The dice gave you nothing, three times. Nothing personal. | Tornado |
| High Roller | The dice alone come to 10 or more, three times in one session | Three tens off the dice alone. Somebody frisk them. | Top hat |
| Underdog | Roll 10 or more with a total modifier of -1 or worse | A 10 on a minus. Every dog has its day. | Hound |

### Superlatives (16)

One winner a session. A tie is shared. Each needs at least two hunters in the session and its own minimum, so nobody wins "most misses" with one miss. A brass cog.

| Badge | Earned by | Line | Icon |
|---|---|---|---|
| Dead Weight | The most misses at the table, and at least 3 | Most misses at the table. At least the XP is good. | Weight |
| Golden Arm | The most rolls of 10 or more, and at least 3 | Most full successes. Enjoy it. It will not last. | Biceps |
| Punching Bag | The most harm taken, and at least 3 | Took the most harm. Have you considered ducking? | Punching bag |
| Heavy Hitter | The most Kick Some Ass rolls of 7 or more, and at least 2 | Landed the most hits. Violence was the answer. | Mailed fist |
| Spotlight Hog | The most rolls, and at least 8 | Rolled more than anyone. Let someone else talk. | Pig |
| Nosy | The most Investigate a Mystery and Read a Bad Situation rolls, and at least 3 | Asked the most questions. Trusted none of the answers. | Nose |
| Human Shield | The most Protect Someone rolls, and at least 2 | Stood in front of everyone else's bad decisions. | Shield |
| Silver Tongue | The most Manipulate Someone rolls of 7 or more, and at least 2 | Talked their way through it. Again. | Tongue |
| Playing with Fire | The most Use Magic rolls, and at least 2 | Used the most magic. Nothing bad ever comes of that. | Lit match |
| Wingman | The most Help Out rolls, and at least 2 | Helped the most. Somebody had to. | Wing |
| Rock Bottom | The lowest single total of the night | Lowest roll of the night. The floor thanks you for visiting. | Rock |
| Peak | The highest single total of the night | Highest roll of the night. We get it. | Peaks |
| Opening Act | The first roll of the night | Rolled first. Somebody had to find out. | Curtains |
| Last Word | The last roll of the night | Had the last roll of the night. Of course you did. | Microphone |
| Mixed Blessing | The most results of 7 to 9, and at least 3 | Most mixed successes. It worked. It also cost you. | Yin and yang |
| Big Spender | The most Luck spent, and at least 2 | Spent the most Luck. It does not grow back. | Cash |

### The Keeper's picks (5)

The Keeper may hand out each of these once a session, to whoever they like. All are optional. A wax seal.

| Badge | Earned by | Line | Icon |
|---|---|---|---|
| Carried the Night | The Keeper picks one hunter | The Keeper says you were the reason anyone lived. | Weightlifter |
| Worst Idea of the Night | The Keeper picks one hunter | The Keeper would like a word about your plan. | Dunce cap |
| Line of the Night | The Keeper picks one hunter | Said the thing everyone will be quoting. | Speech bubble |
| Thorn in My Side | The Keeper picks one hunter | The Keeper had plans. You had other ideas. | Thorns |
| Keeper's Pet | The Keeper picks one hunter | The Keeper is not supposed to have favorites. | Apple |

### Secret badges (A7) (10)

Shown as "???" in everyone's collection until someone at the table earns one. From then on the whole table can see its name and rule. A blackened nut.

| Badge | Earned by | Line | Icon |
|---|---|---|---|
| The Long Dry | Six or more rolls and not one of 10 or more | A whole session without a 10. The campaign is named after you now. | Desert skull |
| Dust to Dust | Die with three or more Luck unspent | Died with Luck in the bank. You cannot take it with you. | Candle skull |
| Same Again | Roll the same two dice three times in a row | The dice are stuck. So are you. | Cycle |
| Twins | Four natural doubles in one session | Seeing double. Four times. | Two shadows |
| Jack of All Trades | Roll all eight basic moves in one session | Tried everything. Mastered nothing. | Pocket knife |
| Deal with the Devil | Spend Luck on a roll of a 1 and a 1 | Snake eyes into a 12. Somebody will want that back. | Handshake |
| Bloodbath | Every hunter at the table takes harm, with three or more hunters | Nobody walked away clean. A proper night out. | Drop |
| Number of the Beast | A 6 and a 6, then a 6 on your very next roll | Three sixes. We are not saying anything. Just noting it. | Horned skull |
| Thirteen | A total of exactly 13 | Rolled a 13. Unlucky for somebody. Not you, this time. | Cat |
| Perfect Night | The table rolls 12 or more times with no misses at all | A whole table, not one miss. Do not expect it again. | Party popper |

### Milestones (6)

Counted over the hunter's whole life, across sessions. "Every 100 rolls" means the badge is earned again at 200, 300 and so on, so its count and rank keep climbing. A riveted copper plate.

| Badge | Earned by | Line | Icon |
|---|---|---|---|
| Fresh Meat | Finish your first session | First session done. All the original parts, for now. | Steak |
| Still Breathing | Finish a session alive | Survived another one. Low bar. Cleared it. | Lungs |
| Century | Every 100 rolls | A hundred rolls. The dice know you by name. | Rolling dice |
| Frequent Flyer | Every 25 misses | Twenty-five misses. That is a lot of experience. | Falling |
| Scar Tissue | Every 25 harm taken | Twenty-five harm and counting. Most of you is original. | Stitches |
| Earned Your Stripes | Every five level-ups | Five improvements. Dangerous, in a good way. Mostly. | Three chevrons |

Adding a badge later is a new row in the page's list and one rule in `worker/awards.mjs`. Because the table keeps every roll (see above), a new badge can also be worked out for nights already played.

### Ranks

A badge earned again counts up, and at the **3rd, 6th and 10th** time it moves up a rank. Each rank is the same token with more on it: a bright ring, then studs on the ring, then a shine that crosses it now and then. The metal also gets cleaner at each rank, so a first badge looks found in the dirt and a tenth looks kept. The count is still shown ("x6").

Milestones use the same ranks, which is what makes them long-haul: Still Breathing reaches its top rank at ten sessions survived.

### What a badge looks like

One token drawn by the page (`badgeSVG`), in the metal of its kind:

| Kind | Token | Wear |
|---|---|---|
| Feat | a crimped tin bottle cap | grime and streaks |
| Superlative | a brass cog | scratches and pits |
| Keeper's pick | an oxblood wax seal | a faint mottle |
| Secret | a blackened hex nut, with the icon in verdigris green | pitting |
| Milestone | a copper plate with cut corners and four rivets | grime and streaks |

The icon is stamped into the middle. The wear is one of the grey texture tiles the dice already use (`img/die-*.jpg`), laid over the metal and turned a different way on different badges, so no new picture files were needed and a token still draws as plain metal if a tile is missing. A badge not yet earned is a dashed outline with a faint icon; a secret nobody has found is a blank nut with a question mark.

Still to come for the look, in J4: the token **stamping down** at the reveal (a hit, a puff of dust from Kenney's smoke sprites, the scorched edge), and whether the top rank's shine is enough motion or wants real frames.

## Ending the session (the Keeper)

On the Keeper's desk, above the handouts:

- **While a session is running:** "Tonight: 4 hunters, 61 rolls, since 7:02 pm" and the button **End the session**.
- **Pressing it opens a preview**, seen only by the Keeper: the scoreboard, and every badge about to be awarded with who gets it.
  - **Keeper's picks:** for each of the five, choose a hunter or leave it out.
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
- `S.night`: `{ n: session number, hid, harm, peak, hit, luck, left, lvl, unst, died }`, the page's running numbers for the current session (`hit` the biggest single harm, `left` the Luck left, `unst` Unstable now).
- `sheet.career`: `{ sessions, rolls, misses, harm, lvls }`, added to each time a tally is applied, for the milestones. Started afresh when the table announces a new session number or the hunter changes.
- `S.synseen`: the newest tally this player has looked at (drives the dot).

**Messages.** New or changed, on the WebSocket that exists:

| Message | From | What |
|---|---|---|
| `roll` (changed) | player | also carries `hid`, `mv` (a basic move id or empty) and `hm` (harm carried at the time) |
| `roll-luck` | player | "my roll number n was rescued with Luck" |
| `card` (changed) | player | also carries `hid`, `pins`, `night` |
| `sess` | table | the current session's number and start, in the first snapshot and whenever it changes |
| `sess-preview` | Keeper | "show me what ending session n would award"; answered only to the Keeper |
| `sess-end` | Keeper | session n, the Keeper's picks, or discard |
| `synopsis` | table | the finished tally, sent to everyone; also fetched by number, and the latest number is in the first snapshot |

**In the table (the Durable Object).** New SQLite tables: the sessions (number, start, last roll, state), the session's rolls (one row a roll: who, which hunter, the dice, the modifier, the move, the harm carried, whether Luck rescued it, when), the hunters in a session (the page's numbers, and the name, playbook and small photo as they were), and the finished tallies (the last 20, each a few kilobytes of JSON). The rolls of a session are deleted when its tally is made, except for sessions never ended, which keep theirs so they can still be awarded. A roll now writes two rows where it wrote one. At a hundred rolls a night that is nowhere near the free plan's daily limits.

**The rules live in one module**, `worker/awards.mjs`: a list of badges (id, kind, minimum, the function that reads a night) and one function that takes a session's rolls and its hunters' numbers and returns who gets what. It has no storage and no network in it, so it is tested in plain Node with made-up nights, the way `tests/t22.js` tests the cleaning. The page has the same list of ids, names, lines and icons for drawing.

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
| J0 | **The list and the token.** `BADGES`, `badgeSVG`, ranks, textures, the icons. | M | **Built 2026-10-10** (`tests/t27.js`). |
| J1 | **Counting.** Hunter ids; `hid`, `mv`, `hm` and `roll-luck` on rolls; the page's `night` numbers; sessions and every roll of them in the table. No screen. | M | Two test players roll a scripted night against the local Worker and the stored tally matches by hand, including a rescued miss, an undone harm click, a hunter who dies and is replaced, and a three-hour gap starting a new session. Old pages and old saves still work. |
| J2 | **The rules.** `worker/awards.mjs` with every session badge (the 57 that are not milestones), ties, minimums, secrets and the two table-wide ones. | M to L | A plain-Node test feeds it a dozen made-up nights (a tie, a lone hunter, nobody qualifying, every secret) and each gives exactly the expected awards. |
| J3 | **Ending the session.** The desk's session line, the preview, the Keeper's picks, discard, and the un-ended list. | M | Only the Keeper can preview or end; a player's attempt is refused; a discarded session awards nothing; a session ended the next day awards correctly. |
| J4 | **The tally.** The dialog, the token drawing, the reveal, the haul, Copy for chat, reopening, and the dot for someone who missed it. | M to L | Three browsers see the same tally within two seconds; Skip, reduced motion and Big moments off all give the plain list; it fits a phone; a player who connects afterwards gets the dot and the badges. |
| J5 | **Badges on the hunter.** The Badges card, pinning, tokens on the Party card and the Keeper's overview, restore from the table. | M | Badges survive a reload, a backup and a hunter switch; five pins at most; a hostile `pins` list from another player draws nothing it should not. |
| J6 | **Badges on the card picture.** | S | The picture shows the pinned row and nothing spills, checked the way `tests/t14.js` checks the rest. |
| J7 | **Words and icons pass.** Jacob's rewrite of the names and lines, and the final icon for each badge. | S | Jacob has read them all. |
| J8 | *(later)* The Keeper answers the end-of-session questions for the table. | M | |
| J9 | **Milestones.** `sheet.career`, added to when a tally is applied; the six milestone badges worked out on the page from it. | S to M | A hunter who reaches 100 rolls across several nights gets Century once, and again at 200; restoring an old backup does not hand any out twice. |

**J1 is worth shipping on its own before Wednesday 2026-10-14.** It has no screen and changes nothing a player sees, but it means the first real session is counted. Because an un-ended session is kept (A3), that night can be awarded as soon as J2 to J4 exist, even if that is days later.

---

# Track L: The hunter's page

Jacob, 2026-10-10: "I want full customization on the card frames so someone should be able to upload their own artwork or choose from ones drawn in code. What I am picturing here is sort of the customization level equivalent to someone's Steam Page."

So a hunter stops being one fixed card and becomes **a page the player lays out**, the way a Steam profile is: a picture and a frame of your choosing, a background, your colors, a featured badge row, and a stack of showcases you pick and order. The small card on the Party tab is the top of that page; opening it shows the rest.

## What a Steam page has, and what ours has

| On a Steam profile | On a hunter's page |
|---|---|
| Avatar and avatar frame | The portrait: its shape, its crop (built), its finish, and a frame around it |
| Profile background | A background behind the page: one of the journal's textures, or your own picture |
| Profile theme color | Your ink, or colors taken from your dice |
| Level | The hunter's level, shown big |
| Featured badge and the badge collection | The pinned badges (track J), and the whole collection further down |
| Showcases you choose and order | Showcases: see the list below |
| Custom info box | An "About" box in your own words |
| Artwork and screenshot showcases | A gallery of up to three of your own pictures |
| Comments | A guestbook: short notes from the rest of the table |
| Animated backgrounds and frames | Flame, ember and smoke frames from the flipbooks, and the top-rank badge shine |

## The rule that keeps it safe

A page's look is **choices from lists the journal already knows, a few bounded numbers, short text, and the ids of pictures that player uploaded**. Never free CSS, never HTML, never a web address. The Worker and the page both check every value, and a page that does not know a value draws the plain version. It is the rule dice codes already follow. Everything on a page is drawn by the journal; a player supplies choices and pictures, not markup.

## Uploading your own artwork

- **What can be uploaded:** a background, a frame for the card, a frame for the portrait, and up to three gallery pictures. Six pictures a player to begin with.
- **How:** the page redraws every picture on a canvas before it is sent, as it already does for the portrait and the Keeper's handouts. That shrinks it (under 700 KB), strips anything hidden in the file, and turns whatever was chosen into a plain JPEG or WebP (PNG where the browser cannot write a WebP with a clear middle). The Worker then checks the first bytes say the same, and refuses anything else. **No SVG**: it can carry script.
- **A frame is a picture with a clear middle.** The player says how wide its border is (one slider), and the journal stretches the edges and keeps the corners, so one piece of art fits a phone card and the wide card picture alike.
- **Where it lives:** in the table's storage, beside the Keeper's pictures. A save and a backup hold the picture's id, not the picture, so a backup stays small; the picture comes back from the table. Without the table (the journal opened from a file), a page falls back to its drawn frame.
- **Who can see it:** only people signed in to the table.
- **Who can remove it:** the player, and the Keeper (one button on the Keeper's overview). Among friends that is enough moderation, and it is written here so nobody is surprised.
- **What it costs:** five players with six pictures each is about 20 MB, far inside the free plan.

## Showcases

A player picks which showcases their page has and in what order (up and down buttons first; dragging later). Each is a small box drawn by the journal from what the hunter already is.

| Showcase | Shows | Needs |
|---|---|---|
| Badge case | The pinned badges, big, with their lines | track J |
| Signature | One weapon, one move and one bond the player features | nothing new |
| About | A few lines in the player's own words | nothing new |
| The dice | The player's two dice and tray, drawn as they are | the dice already travel with the card |
| Bonds | The history with the other hunters | nothing new |
| Career | Sessions, rolls, best night, favorite move | `sheet.career` from J9 |
| Trophy kills | Monsters put down | a "put down by" tick on a bestiary entry, which does not exist yet |
| Gallery | Up to three uploaded pictures | uploads |
| Fallen | The player's dead and retired hunters, stamped with how it ended | the table keeping ended hunters' cards |
| Guestbook | Short notes from the table, newest first; the owner can remove one | a new table in the Worker |

## Chunks

| Chunk | What the player gets | Size | Notes |
|---|---|---|---|
| L0 | **Crop the round portrait.** Drag or use three sliders under the photo so the circle on Play and the Roller shows the face. | S | **Built 2026-10-10** (`tests/t28.js`) after Jacob called the circle awkward. The crop is three numbers with the hunter, ready to travel with the card. |
| L1 | **A personal mark and an epithet.** Any sigil as your emblem, beside your name in the seat list and the roll feed, on the card and the card picture; and a title under the name ("the Dust Saint"). | S to M | Reuses the dice maker's sigil picker. The widest reach for the least work, because the mark shows every time you roll. |
| L2 | **Your colors.** Your ink colors your page on everyone's screen, or **Match my dice** takes the trim from your dice. | S to M | Colors go on the trim and the name, never under body text; the 4.5:1 check in `tests/t18.js` is extended. |
| L3 | **The page itself.** Tapping a hunter on the Party tab opens their page: the header (portrait, name, epithet, level, mark, pinned badges) and the showcases. The first four showcases: Badge case, Signature, About, The dice. A **Customize** screen on My sheet with a live preview. | L | The frame of everything after it. |
| L4 | **Frames drawn in code.** The journal page there is today, a wanted poster, an agency dossier, a tarot card, a dog tag, a riveted scrap plate. Each playbook starts on one that suits it. | L | Borders, stamps and corner pieces as SVG. Two first to prove the system, then the rest. |
| L5 | **The art locker.** Uploading, shrinking, checking, storing, serving and removing a player's pictures, and the Keeper's remove button. No new look yet. | M | The Worker half reuses the Keeper's picture path. Tested like `tests/t25.js`: another player cannot remove yours, a wrong file type is refused, the limit holds. |
| L6 | **Your own background**, or one of the journal's textures (rust, dust, concrete, leather, slate), with a dim and a blur so the text stays readable. | S to M | After L5. The contrast check runs against the dimmed picture's darkest and lightest patch. |
| L7 | **Your own frame**, for the card and for the portrait. | M | After L4 and L5. |
| L8 | **Portrait treatments.** Shape: rectangle, circle, oval cameo, polaroid, torn photo. Finish: as it is, sepia, a two-color poster look. The crop from L0 applies to all of them. | S to M | The photo itself is never changed. |
| L9 | **More showcases:** Bonds, Career, Gallery, Trophy kills, Fallen. | M, in two or three goes | Each waits on what its row above says it needs. |
| L10 | **Motion.** A flame border, drifting embers and smoke as frame and background choices, made from the Unity flame flipbooks and Kenney's smoke sprites; a card that flinches on everyone's Party tab when its hunter takes harm. | M | Strips of frames stepped through the way the candle flame is. Everything stops for reduced motion and for the Big moments switch. |
| L11 | **Guestbook.** | M | Notes are short, escaped text. The owner and the Keeper can remove one. |
| L12 | **Card codes.** Copy your look as a short code, like a dice code. Uploaded pictures do not travel in a code; the code says "their own background" and the page uses the taker's, or none. | S | |
| L13 | **Wear and tear.** Marks a page picks up without anyone choosing: a star for each level, scorched corners at 2 Luck or less, cracks while Unstable. | M | |

**The card picture** (the 1200 x 630 one for chat) follows the look as far as a still picture can: frame, background, colors, mark, epithet and the pinned badges. That is J6 plus a pass at the end of L4 and L6.

Where the choices live: a **Customize** screen opened from My sheet, with the preview on one side and the choices in sections on the other (Look, Portrait, Showcases, Badges). On a phone the preview sits on top.

---

# Proposed order

1. **J1** (counting), built, tested and pushed before Wednesday 2026-10-14, so the first session is recorded. Nothing else is tied to a date.
2. **J2, J3, J4, J5** (the rules, ending the session, the tally, badges on the hunter). The awards are not finished until all four are in.
3. **L1, L2, L3** (the mark, the colors, the page and its first showcases). From here every hunter has a page worth opening.
4. **L5, L6** (the art locker, then your own background): the first uploaded artwork.
5. **L4, L7** (frames in code, then your own frame).
6. **J6, J7, J9** (badges on the card picture, the words pass, milestones).
7. **L8, L9, L10**, then **L11 to L13 and J8** as taste decides.

# For Jacob

Answered on 2026-10-10: the badges are liked; go deeper; icons must fit; textures; frames by upload or drawn in code; Steam-page level; more icons and the flame and smoke packs may be downloaded.

Still open. None of these stops the next chunk (J1), and each has a default I will build to unless told otherwise:

1. **The assumptions table at the top** (A1 to A9). The three that change the build most, with the default in brackets: only hunters shared with the table earn badges (yes); a session starts by itself at the first shared roll after three quiet hours (yes); a miss rescued with Luck still counts as a miss (yes).
2. **The 63 badges.** Any to drop, add or re-rule? Are the lines the right amount of rough? Is "the 3rd, 6th and 10th time" the right pace for ranks?
3. **Five pinned badges** on a card: right number?
4. **Uploads:** six pictures a player, and the Keeper can remove any of them. Right?
5. **A guestbook** on each hunter's page (L11): wanted?
6. **The order above.** In particular, whether any of the page (L1 to L3) should jump ahead of finishing the awards.
