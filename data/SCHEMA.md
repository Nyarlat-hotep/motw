# Playbook data schema (one JSON file per playbook)

Source: ../playbooks.pdf (24 pages, 2 per playbook). Extract text with:
  pdftotext -f <first> -l <last> ../playbooks.pdf -      (add -layout if columns get jumbled)
You can also render a page to PNG (pdftoppm -r 80 -f N -l N -png ../playbooks.pdf out) and look at it with the Read tool if the text order is confusing.

## Rules (important)
1. Write PLAIN ENGLISH in your OWN WORDS. Do NOT copy sentences from the PDF. Shorter and clearer than the original, written for a first-time player.
2. Keep every MECHANICAL fact exact: move names, which stat is rolled, 10+ / 7-9 / miss thresholds, hold amounts, harm numbers, armour numbers, weapon tags, stat caps ("max +3"), pick counts, ratings lines, option lists (names of tags/options/weapons), word lists for the look section.
3. Do not invent anything. If something is unclear, keep it simple and faithful.
4. Output ONLY valid JSON (no comments, no trailing commas) to the file named in your task. Then run `python3 -m json.tool <file> > /dev/null` to validate.
5. Ratings use keys charm, cool, sharp, tough, weird with integer values. "=0" in the PDF means 0.
6. Use straight quotes and plain ASCII where possible (use "-" not long dashes). Keep the same order as the PDF.

## Top-level shape
{
  "id": "chosen",                       // slug
  "name": "The Chosen",                 // exactly as in the app
  "tagline": "one friendly sentence, own words, what this hunter is like to play",
  "difficulty": 1,                      // 0 easier to learn, 1 a bit more to track, 2 more rules to manage (your judgement)
  "ratings": [ {"charm":2,"cool":-1,"sharp":1,"tough":2,"weird":-1}, ... ],   // all lines, in PDF order
  "look": [ {"title":"Age","options":["kid","teen"],"writeIn":true}, ... ],     // lists of words; writeIn true when the sheet leaves a blank
  "luckSpecial": "plain English: what happens when you spend a Luck point (playbook-specific rule)",
  "moves": {
    "intro": "plain English: how many moves you get and from where, mention which are automatic",
    "pick": 1,                           // how many to pick from "choices" at character creation
    "auto": [ MOVE, ... ],               // moves you simply get (may be empty)
    "choices": [ MOVE, ... ]             // moves you pick from
  },
  "gear": [ GEARGROUP, ... ],
  "extras": [ EXTRAGROUP, ... ],         // the playbook-specific creation sections (Fate, Heat, Haven, Sect, Breed, Mission, ...) - may be empty
  "history": [ "8 plain English prompts, one per history option, written as 'This hunter ...' style" ],
  "improvements": [ IMPROVEMENT, ... ],          // regular level-up list, in PDF order, repeated items repeated
  "advanced": [ IMPROVEMENT, ... ]               // advanced list (after 5 level-ups)
}

## MOVE
Rolled move:
{ "id":"chosen-big-entrance", "name":"The Big Entrance", "kind":"roll", "stat":"cool",
  "trig":"When you make a showy entrance into a dangerous situation",
  "full":"10+: result in plain English", "part":"7-9: result", "miss":"miss: result",
  "note":"optional extra (hold spending options, lists of questions, etc.)" }
 - stat is the stat you roll (charm|cool|sharp|tough|weird).
 - trig starts with "When you ..." (or "At the start of each mystery, ..." / "If ..." as the sheet says).
 - full/part/miss are plain-English outcomes WITHOUT the "10+" prefix. If a move has only a 10+ and a 7-9 outcome and says nothing on a miss, set miss to "".
 - Put option lists or questions the player chooses from in "note" (summarised in your own words, keep every option).
Passive move (no roll):
{ "id":"chosen-devastating", "name":"Devastating", "kind":"passive", "summary":"plain English description of the effect, keep all numbers" }

## GEARGROUP
{ "id":"weapons", "title":"Weapons", "intro":"plain English instruction, e.g. Pick three.", "pick":3, "auto":false, "kind":"weapon",
  "items":[ {"name":".22 revolver","harm":1,"tags":"close reload small"}, {"name":"Divine armour","armor":1,"tags":"holy"} ] }
 - pick: number to choose; use 0 with "auto":true for items you just get; use [min,max] if the sheet gives a range; use "optional":true for "if you want".
 - kind: weapon | armor | item (item for non-weapon gear such as gadgets or supplies; items without harm/armor are fine).
 - weapon items: harm (integer) and tags (space separated string, exactly the sheet's tags like "hand messy silver"). Armor items: armor (integer) + tags. If a tag/range is "hand/close" keep it as written.
 - Include a short "note" on the group when the sheet has conditions (for example how pick counts change depending on another choice).
Weapon builder (only when the sheet has you design a weapon from parts):
{ "id":"special-weapon", "kind":"builder", "title":"Your special weapon", "intro":"...",
  "parts":[ {"id":"form","title":"Form","pick":1,"options":[{"label":"staff","harm":1,"tags":"hand close"}]},
            {"id":"end","title":"Business end","pick":3,"options":[{"label":"spikes","harmBonus":1,"tags":"messy"}]},
            {"id":"material","title":"Material","text":true,"suggestions":["steel","silver"]} ] }
 - A form option's harm is the base harm; business-end options use harmBonus (omit if 0) and tags (tags to add).

## EXTRAGROUP (playbook-specific creation choices)
{ "id":"how-found-out", "title":"How you found out", "intro":"plain English", "pick":1,
  "options":[ {"id":"visions","label":"Nightmares and visions","detail":"optional plain-English explanation of what it does, keep numbers"} ] }
 - pick: integer, or [min,max] (e.g. "pick at least two" -> [2,5] using the number of options as max), or 0 when it is only a text prompt.
 - Free-text prompts: { "id":"gang","title":"Name your gang","intro":"...","pick":0,"text":true,"placeholder":"..." }
 - If the sheet has several lists in one section (for example heroic tags and doom tags), make one EXTRAGROUP for each list.
 - If options have a sub-choice (for example "Pick one: vampire, werewolf..."), put the sub-choices in "detail".
 - Extras that behave like moves (haven options, curses, breed powers) still go here as options with a "detail" - not in "moves" - unless the sheet clearly presents them as the playbook's moves.

## IMPROVEMENT
{ "text":"Get +1 Charm, max +3", "kind":"stat", "stat":"charm", "max":3 }    // kind stat: raises that rating by 1 up to max
{ "text":"Take another Chosen move", "kind":"move" }                           // another move from this playbook
{ "text":"Take a move from another playbook", "kind":"othermove" }
{ "text":"Gain an ally", "kind":"other" }                                       // everything else (haven options, allies, retire, change type ...)
 - kind "luck" is for "get back one used Luck point" / "erase one used Luck mark" (restores 1 Luck).
 - kind "advance" is for "mark two of the basic moves as advanced": the page asks which two, and the Roller then shows their 12+ result.
 - "text" is the improvement in plain English, shortened a little but with all numbers/caps. For "+1 to any rating, max +3" use kind "stat" with "stat":"any".
