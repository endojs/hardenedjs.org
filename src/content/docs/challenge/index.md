---
title: Web Challenge
description: Hardened JavaScript Escape Room
slug: challenge
---

<link rel="stylesheet" href="index.css">

In this challenge, the defender has a secret
[Macguffin](https://en.wikipedia.org/wiki/Macguffin), in this case a random
code which the attacker (below) is trying to guess.
Everything is running inside a single, locked-down Hardened JavaScript realm.
The attacker’s code (pasted into the text box) is evaluated by the defender in
a separate Compartment when the Execute button is pressed.

The secret consists of a ten-character alphanumeric code (about 52 bits of
entropy). The attacker’s program gets a “check my guess” function, which
returns a Promise that fires with true for a correct guess and false for a
wrong one.
If the program guesses correctly, red lights flash and the attacker wins.

To make things easier for our attacker, we’ve added a classic timing
side-channel.
Our check function tests one character at a time, and takes 10 milliseconds for
each comparison. An attacker with full access to a clock would try all possible
values for the first character and see which one takes the least time,
concluding that the full password must start with that character. Then they
iterate on the second character, and so on until they’ve worked out the full
password, roughly 18 seconds later.

However, Hardened JavaScript is deterministic and has no timers by default.
Shared intrinsics like `new Date()`, `Date.now()`, and `Math.random()` are
disabled for programs confined to a `Compartment` after `lockdown()` in
Hardened JavaScript.

So this attacker doesn’t get a clock, and cannot read from the covert channel.
We provide an option to leak the real `Date.now()` to demonstrate that the
attack works if attackers receive a clock.

Meanwhile, the defender running in the start Compartment gets access to
powerful JS globals.
This includes sources of non-determinism like `window.setTimeout` and
`window.crypto.getRandomValues` as well as the DOM.

<div class="secret-and-guess">
  <div class="secret">
    <p><strong>Secret</strong></p>
    <div class="outer-box">
      <div class="code-box">
        <span id="macguffin">uninitialized</span>
      </div>
    </div>
  </div>
  <div class="guess">
    <p><strong>Guess</strong></p>
    <div class="outer-box">
      <div class="code-box" id="guess-box">
        <span id="guess">uninitialized</span>
      </div>
    </div>
  </div>
</div>

<button id="attacker-submit" type="button">Attack</button>
<button id="attacker-stop" type="button">Stop</button>

<div class="attacker-input">
  <b>Attacker Code:</b>
    <textarea id="attacker-program" rows="10" cols="80" placeholder="(paste attack code here)">
function*() {
  guess('123456789A');
}
</textarea>
</div>

<label for="date-now-endowed"><input type="checkbox" id="date-now-endowed">
Expose the real `Date.now()` to enable timing side-channel attacks, to
demonstrate their efficacy in the absence Hardened JavaScript.</label>

## Sample Attacks

Try a sample attack! Each of these will  configure and execute a sample attack.

- <button id="sample-0" type="button">All Zeros</button>
- <button id="sample-counter" type="button">Counter</button>
- <button id="sample-timing-blocked" type="button">Timing Channel Frustrated</button>
- <button id="sample-timing-exposed" type="button">Timing Channel Exposed for Demo</button>

## View Source

Find this demo on [Github](https://github.com/endojs/hardenedjs.org/tree/main/public/challenge/index.js).

<script src="../ses.js"></script>
<script src="index.js"></script>
