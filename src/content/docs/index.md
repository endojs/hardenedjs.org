---
title: Hardened JavaScript
description: What is Hardened JavaScript
hero:
  tagline: What is Hardened JavaScript?
  image:
    file: ../../assets/hardened-javascript-logo.svg
  #   - text: Example Guide
  #     link: /guides/example/
  #     icon: right-arrow
  #     variant: primary
  #   - text: Read the Starlight docs
  #     link: https://starlight.astro.build
  #     icon: external
  actions:
    - text: Introduction Video
      link: https://www.youtube.com/watch?v=RZ7bBIU8DRc
      icon: external
---

Hardened JavaScript is a [standards
track](https://github.com/tc39/proposal-ses) mode for the JavaScript language
for safe plugin systems and supply chain attack resistance.
Hardening JavaScript improves a program’s integrity in the face of
adversarial code in the same Realm.

## Mechanisms

Hardened JavaScript has three features: Lockdown, Compartments, and Harden.

- Hardening an object (`harden(object)`) freezes it and every other object
  reachable by visiting prototypes and properties, making it safe to share with
  multiple parties.
  The object (or “capability”) is tamper-proof but not immutable or pure.
  That means none of the parties that hold the object can alter its methods to
  eavesdrop or interfere with other parties.

- A Compartment (`new Compartment()`) is a sandbox with its own global object
  and evaluators (`eval`, `Function`, `AsyncFunction`, `Compartment`, and
  `import`).
  Unlike a same-origin `iframe` or V8 `vm`, all compartments have the same
  _shared intrinsics_ like `Array`, `Object`, `Date`, and `Math`.
  Because these are the same for every compartment, Hardened JavaScript
  enjoys compatibility with the vast majority of JavaScript.
  Programs that rely on `date instanceof Date` work the same.

- Lockdown patches up and _hardens_ the _shared intrinsics_ so they are safe to
  share with other parties and invulnerable to _prototype pollution attacks_.
  For example, after calling `lockdown()`, programs in any compartment can call
  `new Function(code)` to safely evaluate arbitrary code in the same
  compartment, but `new Function.prototype.constructor(code)` throws an error
  so it cannot evaluate code outside the compartment or access the true
  `globalThis`.

## Examples

### Lockdown

Calling Lockdown enters the Hardened JavaScript mode.
Thereafter, the _shared intrinsics_ are frozen.

```js
lockdown();
console.log(Object.isFrozen([].__proto__));
// true
```

Lockdown does not erase any powerful objects from the initial global scope.
Instead, *Compartments* give complete control over what powerful objects
exist for client code.

### Compartment

A compartment is a sandbox in which a program (a plugin or dependency)
can execute but not escape.
In the following example, we create a compartment endowed with a `print()`
function on `globalThis`.

```js
const c = new Compartment({
  globals: harden({ print }),
  __options__: true,
});

c.evaluate(`print('Hello! Hello?');`);
```

> The `__options__` argument is a temporary accommodation for `ses`
> compatibility starting with version 1.6.0 and intended to become unnecessary
> in 2.0.0.

### Harden

Harden gives all parties a foot to stand on to preserve the integrity of
their objects and methods.
Once hardened, an attacker can’t replace the methods of an object they share
with another party.

```js
lockdown();

let counter = 0;
const capability = harden({
  inc() {
    return counter++;
  },
});

console.log(Object.isFrozen(capability));
// true
console.log(Object.isFrozen(capability.inc));
// true
```

Although the *surface* of the object (*capability*) is frozen, the capability
still closes over the mutable counter.
Hardening an object graph makes the surface immutable, but does not guarantee
that methods are free of side effects.

```js
console.log(capability.inc()); // 0
console.log(capability.inc()); // 1
console.log(capability.inc()); // 2
```

## Implementations

- The npm package
  [ses](https://github.com/endojs/endo/tree/master/packages/ses) is a shim for
  Hardened JavaScript.

- [Moddable’s](https://www.moddable.com/) [XS JavaScript
  engine](https://www.moddable.com/hardening-xs) implements Hardened JavaScript
  natively.

## Applications

- [![Agoric Logo](../../assets/agoric-x100.png)](https://agoric.com/)
  [Agoric](https://agoric.com/) uses Hardened JavaScript to confine smart
  contracts.

- [![Moddable Logo](../../assets/moddable-x100.png)](https://www.moddable.com/)
  [Moddable](https://www.moddable.com/) uses Hardened JavaScript to
  confine programs on embedded devices.

- [![LavaMoat Logo](../../assets/lavamoat-x100.png)](https://github.com/LavaMoat/LavaMoat)
  [MetaMask](https://metamask.io/) uses Hardened JavaScript to defend its
  supply chain for its web extension, at build time and run time with
  [LavaMoat](https://github.com/LavaMoat/LavaMoat).

- [![MetaMask Logo](../../assets/metamask-x100.png)](https://metamask.io/)
  [MetaMask](https://metamask.io/) also uses Hardened JavaScript to confine
  its [Snaps](https://metamask.io/snaps/) plugins.


## Boundaries

Hardened JavaScript does not protect the availability of a program.
Any party in the same agent, regardless of compartment isolation, can drop into
an infinite loop and prevent all other parties from making progress.
Hardened JavaScript combines well with carefully chosen process or worker
boundaries.

Hardened JavaScript protects confidentiality by default by omitting
timers and shared state between compartments.
Each compartment’s global object has only certain _hardened, shared intrinsics_
with other compartments, including `Object`, `Array`, `Date`, and `Math`, but
lockdown ensures that `new Date()`, `Date.now()`, and `Math.random()` do not
work in the locked down Realm.
The compartment global object does not get any other properties from the host
(web browser or Node.js) like `performance`.
Without these features, a confined program can’t use timing side channels
or observe that another party is drawing numbers from the `Math` pseudo-random
number generator.

However, many confined programs will need timers and you (the host) can safely
endow the compartments for a _single_ party per process with timers, provided
you keep no confidential information in the same process.

