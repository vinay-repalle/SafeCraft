# Reading a Jira board

A Jira board shows every piece of work the team has, and how far along each piece is, on one screen.

## The idea

In a busy kitchen, order slips hang on a rail: waiting, cooking, plating, served. Anyone can look up and see what is happening without asking. A Jira board is that rail for software.

## The columns

- **To do.** Work that is agreed but not started.
- **In progress.** Someone is working on it right now. The ticket shows who.
- **Review.** The work is finished and waiting for a teammate to check it.
- **Done.** Reviewed, merged and shipped.

Your team may name them differently. The flow from left to right stays the same.

## What a ticket holds

- **A key**, such as ORD-14, that the team uses to refer to it.
- **A title** that says what to do.
- **A description** with the details and what "done" means.
- **An assignee**, the person doing it.
- **A priority**, which says what to pick up first.

## How to use the board

1. Pull the latest code before you begin.
2. Pick the ticket you were asked to take, or the top one if unsure.
3. Move it to In progress, so others know it is taken.
4. Name your branch after the ticket key.
5. When you raise a pull request, move the ticket to Review.

## Why it matters

The board stops two people doing the same job and shows who is waiting on whom. If a ticket sits in Review for days, someone needs a nudge.

## Try it

Level 1 starts at the board: you pick a ticket and move it across.
