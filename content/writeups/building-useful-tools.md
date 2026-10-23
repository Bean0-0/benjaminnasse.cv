---
title: Notes on building useful tools
status: sample
---

# Notes on building useful tools

Start with a small inconvenience. Understand it well enough to make it disappear.

> This is demonstration content for the design preview, not a published article by Benjamin. It shows how Markdown, code, and connected notes could read on this site.

## Start with the repeated step

A useful tool doesn’t have to solve a large problem. Sometimes its entire job is to remove the same three clicks from a task you do every day.

Before writing code, describe the task in plain language. What information is missing? Where do you switch between tools? What do you end up copying by hand?

The [[/#work|selected projects]] are examples of the kinds of work this notebook could connect to: browser tools and integrations between systems.

## Keep the feedback loop short

Make the smallest version that can answer a real question. A simple checklist is often enough to keep the scope honest:

- Identify one repeated task.
- Build one path through it.
- Try it in the place where the task actually happens.
- Write down what still feels slow or confusing.

Even a tiny function can make the boundary of an idea concrete:

```js
function describeTask(task) {
  return {
    input: task.startingPoint,
    output: task.usefulResult,
    friction: task.repeatedSteps,
  };
}
```

The important part isn’t the abstraction. It’s being able to name the `usefulResult` before adding more features.

## Leave a trail

A writeup gives the next project a starting point. Record the constraint, the decision, and what you would change. Connect it to the repository rather than duplicating the whole README.

This sample note links back to the [[/|overview]]. Future notes could link to one another in the same way, turning individual writeups into a small, browsable collection.
