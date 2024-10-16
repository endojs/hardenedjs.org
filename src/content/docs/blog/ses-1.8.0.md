---
title: SES 1.8.0 adds flexibility to Lockdown
date: 2024-08-27
slug: blog/ses-1.8.0
---

[Agoric](https://agoric.com) has released `ses` version
[1.8.0](https://www.npmjs.com/package/ses/v/1.6.0) with more
implementation-specific options to Hardened JavaScript's `lockdown()` function
to improve ecosystem compatibility.

### Regenerator Runtime Compatibility

Old versions of some npm packages used
[`regenerator`](https://github.com/facebook/regenerator) to anticipate
JavaScript's async functions before language support was ubiquitous.
These rely on
[`regenerator-runtime`](https://www.npmjs.com/package/regenerator-runtime) to
approximate the language feature.
However, in the few cases where a dependency on versions 0.10.5 to 0.13.7 of
`regenerator-runtime` persist, applications are incompatible with `ses` due to
misalignment of the global objects the runtime introduces and the environment
that Hardened JavaScript expects from the base language.

### Error Trapping: Report

Starting with SES 1.8.0, the `'report'` mode for `errorTrapping` will write
errors to standard error with the new `SES_UNCAUGHT_EXCEPTION: ` prefix.
The `'report'` mode is sometimes implied by `'platform'`, `'exit'`, or `'abort'`.
This is intended to give valuable context to users of the system, especially
when an uncaught exception is not an `Error` object, and therefore its origin
may be hard to find in source code.

This is not likely to affect most systems built with SES, as stderr is
generally reserved for user-only messages.
If your SES system sends its stderr to a program which parses it, you may need
to adapt that program to be tolerant of the `SES_UNCAUGHT_EXCEPTION: ` prefix.
Even for such programs, it is unlikely they are that sensitive to stderr
formatting.

