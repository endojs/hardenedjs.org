# Non-overt (side and covert) Channels beyond the Challenge page
Dynamic and static sources of non-determinism in JavaScript

See "A Taxonomy of Security Issues" section [Overt, Side, and Covert Channels
](https://papers.agoric.com/taxonomy-of-security-issues/#overt-side-and-covert-channels)

## Measuring Duration

This [challenge page](https://hardenedjs.org/challenge) tests only timing-based side channels. A good challenge page for covert channels would enable the attacker to write attack code on both sides of the boundary. This would also extend the challenge to non-timing covert channels. We are aware of few non-timing-based non-overt channels in JavaScript itself. As far as we know, the following is an exhaustive list.

## Already blocked by `lockdown()`

- `Data.now()`, no-argument calls to the `Date` constructor, `Math.random()`, mutable static properties of the `RegExp` constructor. Starting with Google-Caja in the 2000s, these have been locked down. We're confident these are not non-overt channels in Hardened JS and in the ses-shim and XS implementations of Hardened JS.
- Error stacks. On platforms conforming to [the Error Stacks proposal](https://github.com/tc39/proposal-error-stacks) like XS and Firefox/Spidermonkey, the ses-shim will hide error stacks by default to code running in compartments. However, Safari/JSC gives unconditional access to the error stacks which the ses-shim cannot practically fix. Until recently, we were able to secure errors on Chromium/Node/v8, including the hiding of error stacks. Recently v8 made errors insecurable by placing the stack accessors on error instances, creating a subtle leak the ses-shim cannot fix. However, Google intends to try to conform to [the Error Stacks proposal](https://github.com/tc39/proposal-error-stacks). Aside from XS, SpiderMonkey, JSC, and v8, we do not know how other platforms treat error stacks.
- Node's async_hooks adding unspecified own properties to promises. This happens only when debugging. `lockdown()` already prevents this.

## Host objects

The JavaScript spec by definition does not specify the behavior of host objects; that is up to each host platform. However, they are initially accessible only from properties of the realm's `globalThis` object, i.e., from the global object of the implicit start compartment. The JS spec also states that they must obey the same JS object invariants as everything else, with the explicit exception of `document.all`. For Hardened JS, all I/O or ability to effect the outside world originates only with such host objects.

Hardened JS provides no such effectful host object by default to new compartments, so such host non-determinism is not an immediate concern for non-overt channels. It is currently outside our officially stated threat model. However, in practice we still need to identify those host objects that will often be granted to constructed compartments. We need to do what we can to repair them, and we need to document the remaining threats clearly. Currently we fail to do that for at least Node's `Buffer` objects. (TODO link to @chalker's discussion of `Buffer`.) Non-repaired or non-understood host object are ***MUCH*** worse than an information leak. They can threaten integrity as well.

## Host hooks

The JavaScript spec also makes host-determined behavior observable by [host hooks](https://tc39.es/ecma262/multipage/host-layering-points.html#sec-host-layering-points). Most host hooks do not reveal host behavior that varies at runtime. In other words, most host hooks de-facto leak only static non-determinism enabling fingerprinting, as covered below. However, TODO we still need to exhaustively examine all host hooks to understand what they might leak.

Our long term goal for Hardened JS is to extend Compartments to enable most host hooks to be virtualized, so code on any host can emulate any other host to code running within a compartment. However, it is unclear whether we can overcome the headwinds in tc39 against such virtualizability.

## The NaN-bit leakage channel.

The JavaScript language can leak the bit encoding of a NaN via shared TypedArray views of an common ArrayBuffer. Although the JavaScript language has only one NaN value, the underlying IEEE 754 double-precision floating-point representation has many different bit patterns that represent NaN. This can be exploited as a side-channel to leak information. This actually happens on some platforms such as v8.

@ChALkeR explains at https://github.com/tc39/ecma262/pull/758#issuecomment-3919093669 that the behavior of this side-channel on v8. At https://junk.rray.org/poc/nani.html he demonstrates it, and it indeed even worse than I expected.

This could be both a side channel or a covert channel. It is conceivable that even the existing challenge could be met using the NaN-bit side channel. See [fix(ses): plug implicit NaN side-channel
PR #3153](https://github.com/endojs/endo/pull/3153) for our attempt to plug this non-overt channel. This PR is already merged and is expected to appear soon in an endo release. It fixes `DataView.prototype.setFloat*` methods to canonicalize NaNs, and it denies implicit access to the typed `Float*Array` constructors.

## Leakage through observable GC.

`WeakRef` and `FinalizationRegistry` enable observations of platform GC decisions. From the beginning, we have denied implicit access to these constructors for this reason. For the same reason, we proposed these so they could be cleanly deniable or virtualizable. We even ensured that the `WeakRef.prototype.constructor` link was optional, so a conforming implementation could omit it. If omitted, then a `WeakRef` instance – allowing the observation of the GC of one object – would not implicitly grant the ability to observe the GC of everything else. We initially proposed that cross-realm WeakRefs act strong, which we lost on implementation concerns. But we effectively get that back when cross-realm is membrane-based [cross-shadow-realm](https://github.com/tc39/proposal-shadowrealm).

## The Anthropic channel.

The JS spec is currently completely silent on memory exhaustion. IOW, a correct implementation of the current JS spec is only possible on infinite memory machines. All actual JS implementations do something on memory exhaustion. If they do something recoverable like throw an error, then this becomes a full non-overt channel. [Don't Remember Panicking](https://github.com/tc39/proposal-oom-fails-fast) proposes, instead, that code can somehow be run in a configuration that panics on memory exhaustion, both stack and heap.

This still leads to non-overt information leakage that is more than zero bits but bizarrely less than one bit. For example, if the co-conspirator Bob wishes to leak a `0`, Bob would not exhaust memory. If Bob wishes to leak a `1`, he would exhaust memory causing immediate termination of the so-called agent (tc39 jargon for a JavaScript process). If co-conspirator Carol notices that she is still alive after Bob had his chance to kill the agent, then she knows Bob communicated `0`. But she cannot use that observation for make a runtime decision (an `if`) because she can never observe a `1` bit. I call this the “anthropic channel” because of the analogy that [observers only find themselves on planets suitable for the creation of observers](https://en.wikipedia.org/wiki/Anthropic_principle).

The ses-shim can do nothing robust to ensure that memory exhaustion results in an immediate panic across platforms. But the Hardened JavaScript standard will require that and XS already implements that. Hardened JS gives up on trying to plug the remaining anthropic channel. This is worse than it sounds because in a world of communicating agents, other agents can make a decision on whether a given agent died. Panic is only anthropic within an agent.

## Static non-determinism

The JavaScript spec leaves many other observable issues not-spec-determined and therefore up to implementation. For example, the prose content of error messages of platform-thrown errors. We agree with this position because we want implementations to be able to improve such prose with minimal friction. The spec does not currently specify that this is only static non-determinism, i.e., that it does not change at runtime within the running of a single program. But de-facto, it is in fact only static, and therefore does not enable the normal kind of non-overt channel. But the prose of error messages are still a non-overt channel that leaks bits that threaten a different security concern: Static non determism enables fingerprinting.

Some other de-facto-static potential platform differences
- Locale and time-zone differences can technically vary and runtime. But JS code cannot cause them to vary, and they vary so slowly as to effectively be static channels. In any case, Hardened JS and its ses-shim does replace all the standard `toLocaleString` methods with aliases to the corresponding `toString`. But time-zone into can still leak.
- `for-in` order when the object (and its inheritance chain) being enumerated change during enumeration. tc39 has made progress pinning this down, but AFAIK it remains non-determisitic in the spec.
- What sort algorithm `Array.sort` uses.
- Enumeration order of properties of platform-created objects. This non-determinism is likely a de-jure spec violation. But de-facto it remains and is unlikely to be fixed. This is the one I am least confident leaks only static info. If it leaks dynamic info, it would be very hard for the ses-shim to plug it.
- Probably many others. As long as they are de-facto static, I have put no effort into gathering these. But please expand this list with any others you are aware of.

For these de-facto static sources of spec non-determinism, TODO we should propose to make that staticness de-jure.

## Semi-overt static non-determinism

As the JavaScript spec changes over time, what version of the spec a given implementation implements also leaks bits enabling fingerprinting. But it is hard to classify this as a non-overt channel since each implementation is implementing what an official spec specifies.

---

Are there other spec non-determinisms beside timing and those listed above? Might they enable other non-timing-based non-overt channels? If you know of one, please let us know. If it might be immediately threatening, please consider a [responsible-disclosure](https://github.com/endojs/endo/blob/master/SECURITY.md).
