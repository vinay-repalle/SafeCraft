# What are automated tests?

Automated tests are small programs that check your code for you, every time you share it, in seconds.

## The idea

A kitchen tastes every dish before it leaves the pass. Checking by hand works for ten plates and fails at a hundred. Automated tests are a taster who never gets tired and checks every plate the same way.

## How they work

Each test says what should happen and compares it with what actually happens. For example:

- When the total is 18.5, the page shows `$18.50`.
- When the order is empty, the Place order button is disabled.

If every check matches, the run is green. If one does not, the run is red and the log says which one.

## When they run

Tests run automatically when you raise a pull request, and again each time you push to it. The result appears on the pull request page, so the reviewer sees it too.

## Reading a red log

1. Find the line that says which test failed.
2. Read what it expected and what it got.
3. Find the code that produces the difference.
4. Fix it, commit, push. The tests run again.

A red test is not a judgment on you. It is the tests doing their job before a customer does.

## What they cannot do

Tests only check what someone thought to write down. Green means "nothing we checked is broken", not "nothing is broken". That is why a person still reviews the code.

## Try it

Level 3 gives you a red test log to read, a fix to make and a re-run to watch.
