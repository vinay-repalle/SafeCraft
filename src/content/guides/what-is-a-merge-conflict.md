# What is a merge conflict?

A merge conflict happens when Git cannot decide between two different edits to the same lines. It stops and asks a person to choose.

## The idea

Two people erase and rewrite the same sentence in a shared notebook, each on their own copy. When the copies are put together, there are two different sentences in the same place. Nobody can tell which one is right, so someone has to decide.

## When it happens

Git merges changes automatically when they touch different parts of a file. A conflict needs both of these:

- two people changed the same lines, and
- one of them shared their change first.

The second person to push or pull is the one who meets the conflict.

## What it looks like

Git marks the file like this:

```text
<<<<<<< HEAD
Place order
=======
Order now
>>>>>>> origin/main
```

The top part is your version. The bottom part is your teammate's. Nothing is lost; Git is showing you both.

## How to resolve it

1. Open the file and read both versions.
2. If the choice is not obvious, ask the teammate. They know why they changed it.
3. Keep the version you want, or combine the two.
4. Delete the three marker lines (`<<<<<<<`, `=======`, `>>>>>>>`).
5. Save, commit, and continue.

## What not to do

Do not delete your teammate's version just to make the markers disappear. That throws away their work without a word.

## How to avoid most of them

Pull before you start and again before you push. Keep branches short. Tell teammates when you are about to change a shared file.

## Try it

Level 4 shows two developers editing one file in 3D, then has you resolve the conflict.
