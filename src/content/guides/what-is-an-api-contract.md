# What is an API contract?

An API contract is a written agreement about what one part of the software sends and what the other part sends back.

## The idea

A restaurant menu is a contract. It says what you can ask for and what you will get. The customer does not need to know how the kitchen cooks it, and the kitchen does not need to know who is ordering.

An API works the same way. The frontend asks, the backend answers, and the contract fixes the wording on both sides.

## What it contains

- **The address.** For example `GET /orders/42`.
- **The request.** What the frontend sends, if anything.
- **The response.** The exact fields that come back, and the type of each one.
- **The errors.** What comes back when something is wrong, such as an order that does not exist.

## A real example

```json
{
  "id": 42,
  "status": "preparing",
  "estimatedMinutes": 20,
  "total": 18.5
}
```

Here `estimatedMinutes` is a number, not the text "20 minutes". The screen can add and compare numbers; it cannot do that with text. Details like this are exactly what the contract settles.

## Why write it down

- Frontend and backend can work at the same time.
- A change becomes a visible edit instead of a surprise.
- Questions get answered by reading, not by guessing.

## When it changes

Plans change. When they do, update the contract first, tell the other developer, then change the code on both sides together. A silent change breaks the other person's work.

## Try it

Level 2 has you agree a contract with the backend developer. Level 5 has you update one mid-ticket.
