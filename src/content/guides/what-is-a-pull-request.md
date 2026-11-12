# What is a pull request?

A pull request, or PR, is a message to your team that says: "My work is ready. Please check it before it joins the main code."

## The idea

Imagine a shared recipe book that the whole kitchen cooks from. You do not scribble a new recipe straight into it. You write the recipe on your own sheet, then hand it to a colleague and ask them to taste it first. Only when they agree does it go into the book.

A pull request is that hand-over. It shows exactly what you changed, line by line, and gives teammates a place to talk about it.

## What a pull request holds

- **A title and a short description.** What changed, and why.
- **The changes.** Lines removed are shown in red, lines added in green.
- **Test results.** Automated tests run on your change and report pass or fail.
- **Comments.** Teammates ask questions or suggest edits. You reply or fix the code.
- **An approval.** Once a reviewer is happy, the change can be merged.

## A real example

Priya changes the checkout button to say "Place order". She pushes her branch and raises a pull request titled "ORD-14: Rename checkout button". Sam reads the three changed lines, asks whether the button label is also used on the order page, and Priya fixes the second place. Sam approves and the change is merged.

## A good habit

Keep pull requests small. A reviewer can read ten lines carefully. Nobody reads a thousand lines carefully.

## Try it

Level 3 has you raise a pull request, read a red test log, fix the code and answer a reviewer.
