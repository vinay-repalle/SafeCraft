# What is a branch?

A branch is your own copy of the code to work on, so your changes do not disturb anyone else until you decide to share them.

## The idea

The team keeps one shared notebook. If everyone wrote in it at once, pages would be crossed out and overwritten. Instead, you photocopy the pages you need, write on your copy, and clip it back into the notebook once your teammates have read it.

That photocopy is a branch. The original notebook is the main branch.

## How it works

- **The repository** is the project folder, with the full history of every change.
- **Main** is the shared, trusted version.
- **A branch** starts as an exact copy of main at one moment in time.
- **Commits** are saved steps on your branch. Each one has a short message.
- **Merging** brings your branch back into main after review.

## Naming a branch

A good name says what the work is. Many teams use the ticket number and a few words:

`feature/ORD-14-place-order-button`

Anyone reading the list of branches can tell which ticket each one belongs to.

## The commands

- `git pull origin main` brings in the latest changes before you start.
- `git checkout -b feature/ORD-14-place-order-button` creates the branch and moves you onto it.
- `git commit -m "message"` saves a step.
- `git push origin feature/ORD-14-place-order-button` shares the branch.

## A good habit

Pull before you start. If main moved on while you were away, your copy begins out of date and you meet the differences later, at a worse moment.

## Try it

Level 1 has you pull, pick a ticket, create a branch and ship a small change.
