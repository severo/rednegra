---
title: Parse, don't validate
tags: posts, programming
---

Alexis King coined the expression ["Parse, don't validate"](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) in 2019.

I discovered it today reading [Speeding up the JavaScript ecosystem - Semver](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-12/) by Marvin Hagemeister.

> To validate input correctness, both validator functions parse the input data, allocate the resulting data structure and return back the original input string if it passed the check. When we call the satisfies function, we do the same work that we just threw away again. This is a classic case of doing twice the work necessary due to not following the "Parse, don't validate" rule.

Quoting Alexis King, the principle is to use the typing system to:

- Use a data structure that makes illegal states unrepresentable,
- Push the burden of proof upward as far as possible, but no further.

I think the most useful insight is the first point: _using a data structure that makes illegal states unrepresentable_ and its comment:

> Model your data using the most precise data structure you reasonably can. If ruling out a particular possibility is too hard using the encoding you are currently using, consider alternate encodings that can express the property you care about more easily. Don’t be afraid to refactor.

The second point is a direct consequence of the first.

His example uses Haskell and treats the problem of an array that should not be empty. Instead of passing a regular array along all the code, he creates a "non empty array" type, and parses his array as soon as possible, returning a "non empty array", or failing. It's known as ["type narrowing"](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) (or type guarding) in TypeScript.

## Translated in TypeScript

Let's reproduce the example in TypeScript. We want to parse a regular array and ensure it's not empty.

We define type as:

```ts
type NonEmptyArray<T> = [T, ...T[]];
```

(thanks Copilot for helping me with that, as generic types are not my favorite hobby)

Then, the parsing function is:

```ts
function parseArray(input: unknown): NonEmptyArray<unknown> {
  if (!Array.isArray(input)) {
    throw new Error("Input is not an array");
  }
  if (input.length === 0) {
    throw new Error("Array is empty");
  }
  return input as NonEmptyArray<unknown>;
}
```

Once the array has been parsed, you will never have to check its emptiness again. If you modify the array with `.map`, TypeScript will ensure you still have a non-empty array as a result.
