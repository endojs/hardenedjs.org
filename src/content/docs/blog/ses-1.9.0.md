---
title: SES 1.9.0 introduces immutable ArrayBuffers
date: 2024-10-10
slug: blog/ses-1.9.0
---

SES 1.9.0 introduces immutable `ArrayBuffer`, exposes its `console` shim, and permits
a global `ModuleSource` in the shared intrinsics.

### Immutable ArrayBuffer

JavaScript strings are immutable, but JavaScript lacks an immutable analog for
ArrayBuffer.
So, one can have a string of text and send it without making a copy to defend
its invariance, but not a string of bytes.

Agoric's [Mark Miller](https://agoric.com/team/)
[presented](https://www.youtube.com/watch?v=CP_5Yo9h84k) a
[proposal](https://github.com/tc39/proposal-immutable-arraybuffer) at the
October plenary meeting of the JavaScript standard committee, ECMA TC39.
The committee adopted Immutable Array Buffers into the body of problems under
consideration for a solution in a future standard, called "Stage 1".

SES 1.9.0 is the first release to introduce an emulation of the proposed
immutable ArrayBuffer.

On platforms without
[`Array.prototype.transfer`](https://github.com/tc39/proposal-resizablearraybuffer)
but with a global `structuredClone`, the `ses` shim's `lockdown` will now install
an emulation of `Array.prototype.transfer`.
On platforms with neither, `ses` will *currently* not install such an
emulation.
However, once we verify that `ses` is not intended to support platforms without
both, we may change `lockdown` to throw, failing to lock down.

- XS and Node >= 22 already have `Array.prototype.transfer`.
- Node 18, Node 20, and all browsers have `structuredClone`
- Node <= 16 have neither, but are also no longer supported by `ses`.

### Console Shim

The `ses` shim consists of mostly separable layers:

- `ses/assert-shim.js`
- `ses/lockdown-shim.js`
- `ses/compartment-shim.js`
- `ses/console-shim.js`

Version 1.9.0 is the first release to expose an entry point for
`ses/console-shim.js` so the user can choose whether to wrap and replace the
global `console` from the hardened JavaScript realm with a version that can
unredact error messages.

### ModuleSource

Agoric champions a number of JavaScript standard proposals under the umbrellas
of [Hardened JavaScript](https://github.com/tc39/proposal-ses),
[Compartments](https://github.com/tc39/proposal-compartments/blob/master/0-module-and-module-source.md),
and a broad effort toward "Module Harmony".
These include a proposal for a global `ModuleSource` that takes the source code
of a JavaScript module and prepares it for evaluation.

The package `@endo/module-source` provides an emulation of a `ModuleSource`
constructor suitable for use in combination with `ses` and [Moddable's
XS](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/xs/XS%20Compartment.md)
provides a native implementation.
The module `@endo/module-source/shim.js` can install the emulated `ModuleSource`
in global scope so it becomes available as a shared intrinsic.

Version 1.9.0 adds `ModuleSource` to the shared intrinsics that `lockdown` will
repair if necessary and then harden, which consequently is available by default
in every new `Compartment`.
