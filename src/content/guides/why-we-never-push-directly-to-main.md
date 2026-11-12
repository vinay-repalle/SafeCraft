# Why we never push directly to main

The main branch is the version of the code that the team trusts. Pushing straight to it skips every check that keeps it trustworthy.

## The idea

Think of the menu printed for customers. A cook can try a new dish in a test kitchen as many times as they like. The printed menu only changes after someone has tasted it and agreed. If anyone could edit the printed menu directly, one typo would reach every table.

Main is the printed menu. Branches are the test kitchen.

## What goes wrong

- **Broken code goes live.** On many teams, whatever lands on main is released to real users soon after.
- **Nobody else has looked.** A second pair of eyes catches mistakes the author cannot see.
- **Tests never ran.** The automated tests run on a pull request. A direct push skips them.
- **Teammates are surprised.** Everyone else pulls main to start their work. If it changes without notice, their work can collide with yours.

## What to do instead

1. Create a branch for the ticket.
2. Commit your work to that branch.
3. Push the branch and raise a pull request.
4. Merge only after the tests pass and a reviewer approves.

Many teams switch on a setting called branch protection, so GitHub refuses a direct push to main at all.

## A real example

A developer pushes a quick fix straight to main at 5 pm. It contains a typo in the payment call. The live site cannot take orders until someone notices and undoes it.

## Try it

Every level counts a direct push to main as a mistake and shows what it would have caused in the replay at the end.
