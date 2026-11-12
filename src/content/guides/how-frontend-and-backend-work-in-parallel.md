# How frontend and backend work in parallel

Frontend and backend developers can build at the same time, without waiting for each other, if they agree on the shape of the data first.

## The idea

Two cooks prepare one meal. One makes the sauce, the other cooks the pasta. They do not need to watch each other, but they do need to agree up front: how much sauce, and in which bowl. If they skip that talk, the pieces do not fit at the end.

In software, the frontend is what the user sees. The backend holds the data and the rules. They meet at an API, and the agreement about what passes through it is the API contract.

## How it works

1. **Talk first.** Both developers agree on the request and the response, for example the field names and whether a price is a number or text.
2. **Write it down.** The agreement is a small piece of JSON that both can see.
3. **Frontend builds against mock data.** Mock data is a made-up response in the agreed shape, so the screen can be built before the real endpoint exists.
4. **Backend builds the real endpoint** to return the same shape.
5. **Swap and test.** The frontend replaces the mock data with the real call. If both followed the contract, it just works.

## A real example

Priya needs the order status on the screen. Dev agrees to return `{ "status": "preparing", "estimatedMinutes": 20 }`. Priya builds the screen with that exact object. A week later Dev's endpoint is ready and the screen needs no change.

## What goes wrong without it

Priya guesses the field is called `eta`. Dev calls it `estimatedMinutes`. Both finish on time and nothing works together.

## Try it

Level 2 has you agree a contract in chat, then build against mock data.
