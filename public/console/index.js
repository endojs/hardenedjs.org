/* globals globalThis, document */

lockdown();

const { quote: q } = assert;

const $ = (selector) => document.querySelector(selector);

const $execute = $("#execute");
const $clear = $("#clear");
const $input = $("#input");
const $output = $("#output");

// Under the default `lockdown` settings, it is safe enough
// to endow with the safe `console`.
const compartment = new Compartment({
  console,
  // See https://github.com/Agoric/agoric-sdk/issues/9515
  assert: globalThis.assert,
});

$execute.addEventListener("click", () => {
  const sourceText = $input.value;
  let result;
  let outputText;
  try {
    result = compartment.evaluate(sourceText);
    console.log(result);
    outputText = `${q(result, "  ")}`;
  } catch (e) {
    console.log("threw", e);
    outputText = `threw ${q(e)}`;
  }
  $output.value = outputText;
});

$clear.addEventListener("click", () => {
  $input.value = "";
  $output.value = "";
});

$input.value = `\
/**
* This example shows two compartments executing the same code with
* different globals. They are isolated from each other and from
* their parent execution context.
*/
const x = 0;
const c1 = new Compartment({ x: 1 });
const c2 = new Compartment({ x: 2 });

const x1 = c1.evaluate('x');
const x2 = c2.evaluate('x');
/**
* This line below will output 3 values to demonstrate that
* x has a different value in every context:
* - 0 in the start compartment
* - 1 in compartment #1
* - 2 in compartment #2
*/
({ x, x1, x2 })
`;
